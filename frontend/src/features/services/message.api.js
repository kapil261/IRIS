import axios from 'axios'

const api = axios.create({
    baseURL: "http://localhost:3000/api"
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('iris_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

export const PostMessage = async (threadid, message, useDocuments, onChunk, onSources) => {
    const token = localStorage.getItem('iris_token')
    const response = await fetch("http://localhost:3000/api/message", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({
            threadid,
            message,
            useDocuments
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to post message");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let finished = false;
    let buffer = "";

    while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let lineEndIdx;
        while ((lineEndIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, lineEndIdx).trim();
            buffer = buffer.slice(lineEndIdx + 1);

            if (line.startsWith('data: ')) {
                const dataText = line.slice(6).trim();
                if (dataText === '[DONE]') {
                    finished = true;
                    break;
                }
                
                try {
                    const parsed = JSON.parse(dataText);
                    if (parsed.type === 'sources') {
                        onSources(parsed.sources);
                    } else if (parsed.type === 'content') {
                        onChunk(parsed.content);
                    } else if (parsed.type === 'error') {
                        throw new Error(parsed.error);
                    }
                } catch (e) {
                    console.error("Error parsing stream chunk:", e);
                }
            }
        }
    }
}

export const GetChats = async () => {
    const response = await api.get("/chats")
    return response.data
}

export const GetChatById = async (id) => {
    const response = await api.get(`/chat/${id}`)
    return response.data
}

export const DeleteChat = async (id) => {
    const response = await api.delete(`/chat/${id}`)
    return response.data
}

export const RenameChat = async (id, title) => {
    const response = await api.put(`/chat/${id}`, { title })
    return response.data
}

export const UpdateChatSettings = async (id, settings) => {
    const response = await api.put(`/chat/${id}`, settings)
    return response.data
}

export const GetDocuments = async () => {
    const response = await api.get("/documents")
    return response.data
}

export const UploadDocument = async (formData) => {
    const response = await api.post("/documents/upload", formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
    return response.data
}

export const DeleteDocument = async (id) => {
    const response = await api.delete(`/documents/${id}`)
    return response.data
}

export default PostMessage