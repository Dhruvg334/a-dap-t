from datetime import datetime
from uuid import uuid4


def audit_log(event_type, user_id, action, approval_status, trace_id=None, metadata=None):
    return {
        "event_type": event_type,
        "user_id": user_id,
        "action": action,
        "approval_status": approval_status,
        "trace_id": trace_id or str(uuid4()),
        "metadata": metadata or {},
        "timestamp": datetime.utcnow().isoformat(),
    }
