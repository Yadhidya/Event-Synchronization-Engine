package com.example.realtimeengine.controller;

import com.example.realtimeengine.model.EventMessage;
import com.example.realtimeengine.service.ChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @MessageMapping("/chat")
    public void handleChat(EventMessage message) {
        chatService.processEvent(message);
    }
}