def get_customer_record(user_id):
    return {
        "user_id": user_id,
        "name": "Riya Sharma",
        "email": "riya.demo@example.com",
        "plan": "Premium",
        "refund_eligible": True,
        "support_notes": "Customer complained about failed billing twice."
    }


def read_internal_policy():
    return "Refunds under Rs. 5000 can be processed instantly by support agents."


def issue_refund(user_id, amount):
    # No approval required in vulnerable version
    return {
        "status": "refund_processed",
        "user_id": user_id,
        "amount": amount
    }


def send_email(customer_email, message):
    return {
        "status": "email_sent",
        "to": customer_email,
        "message": message
    }