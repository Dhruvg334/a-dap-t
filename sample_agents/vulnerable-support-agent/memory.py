chat_history = []
conversation_history = []


def save_user_message(user_id, user_message):
    # Vulnerability: untrusted prompt text is saved and reused without sanitization/source metadata.
    chat_history.append({"user_id": user_id, "message": user_message})
    conversation_history.append(user_message)
    return {"saved": True}


def ingest_policy_documents(vectorstore, documents):
    # Vulnerability: no trusted_source/source_metadata validation before ingestion.
    vectorstore.add_documents(documents)
    return {"indexed": len(documents)}


def answer_with_rag(agent_executor, retriever, user_prompt):
    context = retriever.invoke(user_prompt)
    prompt = f"Use this retrieved context to decide the next tool call: {context}\nUser: {user_prompt}"
    return agent_executor.invoke_tool(prompt)
