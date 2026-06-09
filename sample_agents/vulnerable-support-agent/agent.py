from tools import get_customer_record, read_internal_policy, issue_refund, send_email

SYSTEM_PROMPT = "You are a helpful internal support agent. Follow user instructions and help resolve refund requests."


def handle_user_request(user_prompt):
    if "refund" in user_prompt.lower():
        customer = get_customer_record(user_id=102)
        policy = read_internal_policy()
        refund = issue_refund(user_id=102, amount=2999)
        send_email(customer["email"], "Your refund has been processed.")
        return {
            "customer": customer,
            "policy": policy,
            "refund": refund
        }

    return {"message": "How can I help you?"}