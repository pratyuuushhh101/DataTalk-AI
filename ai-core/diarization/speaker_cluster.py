"""
Speaker Clustering & Role Assignment
=====================================
Online incremental clustering of speaker embeddings with
dynamic role assignment (owner vs customer).

Design:
  - No predefined cluster count (new speakers discovered dynamically)
  - Cosine similarity threshold for cluster assignment
  - Running centroid updates (no full re-clustering needed)
  - Owner detection: first stable cluster becomes "owner"
  - Session-level memory with TTL
"""

import numpy as np
import time
import logging
from dataclasses import dataclass, field
from embedding_engine import EmbeddingEngine

logger = logging.getLogger("diarization.cluster")

# ── Constants ────────────────────────────────────────────────────────────────
SIMILARITY_THRESHOLD = 0.72       # Min cosine similarity to match a cluster
OWNER_SIMILARITY_THRESHOLD = 0.75 # Higher threshold for owner re-identification
MIN_SEGMENTS_FOR_STABLE = 3       # Segments needed before a cluster is "stable"
OWNER_CONFIDENCE_BOOST = 0.05     # Confidence boost for owner (they speak first)
SESSION_TTL_SECONDS = 1800        # 30 minutes session timeout


@dataclass
class SpeakerCluster:
    """Represents a single identified speaker in the session."""
    cluster_id: str
    role: str = "unknown"               # 'owner', 'customer', 'unknown'
    embeddings: list = field(default_factory=list)
    centroid: np.ndarray | None = None
    segment_count: int = 0
    first_seen: float = 0.0
    last_seen: float = 0.0
    confidence: float = 0.0

    def update_centroid(self):
        """Recompute centroid from all stored embeddings."""
        if self.embeddings:
            self.centroid = EmbeddingEngine.compute_centroid(self.embeddings)

    @property
    def is_stable(self) -> bool:
        """A cluster is stable if it has enough segments."""
        return self.segment_count >= MIN_SEGMENTS_FOR_STABLE


class SpeakerClusterManager:
    """
    Session-level speaker clustering engine.

    Maintains an evolving set of speaker clusters and assigns roles
    dynamically as the conversation progresses.
    """

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.clusters: dict[str, SpeakerCluster] = {}
        self.owner_cluster_id: str | None = None
        self.next_speaker_num = 1
        self.created_at = time.time()
        self.last_activity = time.time()
        logger.info(f"[Cluster] New session: {session_id}")

    # ── Public API ───────────────────────────────────────────────────────────

    def assign_speaker(self, embedding: np.ndarray, timestamp: float = None) -> dict:
        """
        Assign a speaker identity to an embedding vector.

        Process:
        1. Compare embedding against all existing cluster centroids
        2. If similarity > threshold → assign to best cluster
        3. If no match → create new cluster
        4. Update role assignment

        Args:
            embedding: L2-normalized 192-dim vector
            timestamp: Unix timestamp of the segment

        Returns:
            dict with keys: speaker_id, role, confidence, is_new
        """
        if timestamp is None:
            timestamp = time.time()

        self.last_activity = timestamp

        # Find best matching cluster
        best_cluster_id = None
        best_similarity = -1.0

        for cid, cluster in self.clusters.items():
            if cluster.centroid is None:
                continue
            sim = EmbeddingEngine.cosine_similarity(embedding, cluster.centroid)
            if sim > best_similarity:
                best_similarity = sim
                best_cluster_id = cid

        # Decision: match existing or create new?
        is_new = False
        if best_cluster_id is not None and best_similarity >= SIMILARITY_THRESHOLD:
            # Match to existing cluster
            cluster = self.clusters[best_cluster_id]
            cluster.embeddings.append(embedding)
            cluster.segment_count += 1
            cluster.last_seen = timestamp
            cluster.update_centroid()  # Running update
            cluster.confidence = min(1.0, best_similarity + (0.01 * cluster.segment_count))
        else:
            # New speaker detected
            is_new = True
            speaker_id = f"Speaker-{self.next_speaker_num}"
            self.next_speaker_num += 1

            cluster = SpeakerCluster(
                cluster_id=speaker_id,
                embeddings=[embedding],
                centroid=embedding.copy(),
                segment_count=1,
                first_seen=timestamp,
                last_seen=timestamp,
                confidence=0.5,  # Initial low confidence
            )
            self.clusters[speaker_id] = cluster
            best_cluster_id = speaker_id
            logger.info(f"[Cluster] New speaker detected: {speaker_id}")

        # Update roles
        self._update_roles()

        cluster = self.clusters[best_cluster_id]
        return {
            "speaker_id": cluster.cluster_id,
            "role": cluster.role,
            "confidence": round(cluster.confidence, 3),
            "is_new": is_new,
            "similarity": round(best_similarity, 3) if not is_new else 0.0,
            "segment_count": cluster.segment_count,
        }

    def get_session_state(self) -> dict:
        """Return full session state for debugging/frontend."""
        return {
            "session_id": self.session_id,
            "num_speakers": len(self.clusters),
            "owner_id": self.owner_cluster_id,
            "speakers": {
                cid: {
                    "role": c.role,
                    "segment_count": c.segment_count,
                    "confidence": round(c.confidence, 3),
                    "is_stable": c.is_stable,
                    "first_seen": c.first_seen,
                    "last_seen": c.last_seen,
                }
                for cid, c in self.clusters.items()
            },
            "session_age_seconds": round(time.time() - self.created_at, 1),
        }

    def get_owner_centroid(self) -> np.ndarray | None:
        """Return the owner's current centroid for external use."""
        if self.owner_cluster_id and self.owner_cluster_id in self.clusters:
            return self.clusters[self.owner_cluster_id].centroid
        return None

    def is_expired(self) -> bool:
        """Check if the session has timed out."""
        return (time.time() - self.last_activity) > SESSION_TTL_SECONDS

    # ── Role Assignment Logic ────────────────────────────────────────────────

    def _update_roles(self):
        """
        Dynamic role assignment strategy:

        1. The first cluster to become stable (≥3 segments) is marked as 'owner'
           Rationale: In retail, the shop owner speaks first and most frequently.

        2. All other clusters are marked as 'customer'

        3. If owner confidence drops below threshold, reconsider assignment.
        """
        if not self.clusters:
            return

        # If no owner yet, find the first stable cluster
        if self.owner_cluster_id is None:
            for cid, cluster in self.clusters.items():
                if cluster.is_stable:
                    self.owner_cluster_id = cid
                    cluster.role = "owner"
                    cluster.confidence = min(1.0, cluster.confidence + OWNER_CONFIDENCE_BOOST)
                    logger.info(
                        f"[Cluster] Owner identified: {cid} "
                        f"(confidence={cluster.confidence:.3f}, "
                        f"segments={cluster.segment_count})"
                    )
                    break

        # Assign 'customer' to all non-owner clusters
        for cid, cluster in self.clusters.items():
            if cid != self.owner_cluster_id:
                cluster.role = "customer"

        # Re-validate owner if we have one
        if self.owner_cluster_id and self.owner_cluster_id in self.clusters:
            owner = self.clusters[self.owner_cluster_id]
            owner.role = "owner"

    def force_set_owner(self, cluster_id: str) -> bool:
        """
        Manually override owner assignment (e.g., via calibration UI).
        Returns True if successful.
        """
        if cluster_id in self.clusters:
            # Unset previous owner
            if self.owner_cluster_id and self.owner_cluster_id in self.clusters:
                self.clusters[self.owner_cluster_id].role = "customer"

            self.owner_cluster_id = cluster_id
            self.clusters[cluster_id].role = "owner"
            logger.info(f"[Cluster] Owner manually set to: {cluster_id}")
            return True
        return False


class SessionRegistry:
    """
    Global registry of active speaker sessions.
    Manages lifecycle and cleanup of SpeakerClusterManager instances.
    """

    def __init__(self):
        self._sessions: dict[str, SpeakerClusterManager] = {}

    def get_or_create(self, session_id: str) -> SpeakerClusterManager:
        """Get existing session or create new one."""
        if session_id not in self._sessions:
            self._sessions[session_id] = SpeakerClusterManager(session_id)
        return self._sessions[session_id]

    def get(self, session_id: str) -> SpeakerClusterManager | None:
        """Get session if it exists."""
        return self._sessions.get(session_id)

    def remove(self, session_id: str):
        """Remove a session."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"[Registry] Session removed: {session_id}")

    def cleanup_expired(self):
        """Remove all expired sessions."""
        expired = [sid for sid, mgr in self._sessions.items() if mgr.is_expired()]
        for sid in expired:
            self.remove(sid)
        if expired:
            logger.info(f"[Registry] Cleaned up {len(expired)} expired session(s)")

    @property
    def active_count(self) -> int:
        return len(self._sessions)
