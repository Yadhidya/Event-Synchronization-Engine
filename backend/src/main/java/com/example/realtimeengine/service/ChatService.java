package com.example.realtimeengine.service;

import com.example.realtimeengine.model.ChatEventType;
import com.example.realtimeengine.model.EventMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class ChatService {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatService(PresenceService presenceService,
                       SimpMessagingTemplate messagingTemplate) {
        this.presenceService = presenceService;
        this.messagingTemplate = messagingTemplate;
    }

    public EventMessage processEvent(EventMessage message) {

        if (message.getId() == null || message.getId().isEmpty()) {
            message.setId(UUID.randomUUID().toString());
        }

        if (message.getTimestamp() == 0) {
            message.setTimestamp(System.currentTimeMillis());
        }

        switch (message.getType()) {

            case USER_JOINED:
                Map<String, Object> joinPayload =
                        (Map<String, Object>) message.getPayload();
                String joinUser = (String) joinPayload.get("username");
                presenceService.addUser(joinUser);
                broadcastOnlineUsers();
                break;

            case USER_LEFT:
                Map<String, Object> leftPayload =
                        (Map<String, Object>) message.getPayload();
                String leftUser = (String) leftPayload.get("username");
                presenceService.removeUser(leftUser);
                broadcastOnlineUsers();
                break;

            case MESSAGE_SENT:
            case USER_TYPING:
                // Just broadcast the event as-is
                messagingTemplate.convertAndSend("/topic/chat", message);
                break;
        }

        return message;
    }

    private void broadcastOnlineUsers() {
        EventMessage updateEvent = new EventMessage();
        updateEvent.setId(UUID.randomUUID().toString());
        updateEvent.setType(ChatEventType.ONLINE_USERS_UPDATE);
        updateEvent.setPayload(presenceService.getOnlineUsers());
        updateEvent.setTimestamp(System.currentTimeMillis());

        messagingTemplate.convertAndSend("/topic/chat", updateEvent);
    }
}