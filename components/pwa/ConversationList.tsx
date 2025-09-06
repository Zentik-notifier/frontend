import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";

const DUMMY = Array.from({ length: 20 }).map((_, i) => ({
  id: String(i),
  title: `Conversation ${i + 1}`,
  last: "Ciao, come va?",
}));

export function ConversationList() {
  return (
    <FlatList
      data={DUMMY}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.item}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.last}>{item.last}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontWeight: "700",
  },
  last: {
    color: "#666",
    marginTop: 6,
  },
});


