package com.example.realtimeengine.model;

public class EventMessage {

    private String id;
    private ChatEventType type;
    private Object payload;
    private long timestamp;

    public EventMessage() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public ChatEventType getType() {
        return type;
    }

    public void setType(ChatEventType type) {
        this.type = type;
    }

    public Object getPayload() {
        return payload;
    }

    public void setPayload(Object payload) {
        this.payload = payload;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}