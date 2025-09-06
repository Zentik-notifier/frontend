import React from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const MESSAGES = Array.from({ length: 10 }).map((_, i) => ({ id: String(i), text: `Messaggio ${i + 1}`, me: i % 2 === 0 }));

export function ConversationView() {
  return (
    <View style={styles.container}>
      <FlatList
        data={MESSAGES}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={[styles.message, item.me ? styles.me : styles.them]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.messagesList}
      />

      <View style={styles.composer}>
        <TextInput style={styles.input} placeholder="Scrivi un messaggio..." />
        <TouchableOpacity style={styles.sendButton}>
          <Text style={{ color: "#fff" }}>Invia</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  messagesList: {
    padding: 12,
  },
  message: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: "80%",
  },
  me: {
    backgroundColor: "#0b93f6",
    alignSelf: "flex-end",
  },
  them: {
    backgroundColor: "#eee",
    alignSelf: "flex-start",
  },
  messageText: {
    color: "#000",
  },
  composer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#0b93f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
});


