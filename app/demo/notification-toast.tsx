import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Text, useTheme } from 'react-native-paper';
import { useNotificationToast } from '../../contexts/NotificationToastContext';

/**
 * Schermata di demo per testare il componente IncomingNotificationToast
 * Accessibile da /demo/notification-toast
 */
export default function NotificationToastDemoScreen() {
  const theme = useTheme();
  const { showNotification } = useNotificationToast();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineMedium" style={styles.title}>
        Notification Toast Demo
      </Text>
      <Text variant="bodyMedium" style={styles.description}>
        Testa il componente IncomingNotificationToast con diversi esempi
      </Text>

      <Divider style={styles.divider} />

      {/* Simple notification */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Notifica semplice
        </Text>
        <Button
          mode="contained"
          onPress={() =>
            showNotification({
              title: 'Nuova notifica',
              body: 'Hai ricevuto un nuovo messaggio',
            })
          }
          style={styles.button}
        >
          Mostra notifica base
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* With image */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Con immagine
        </Text>
        <Button
          mode="contained"
          onPress={() =>
            showNotification({
              title: 'Foto ricevuta',
              body: 'Mario ha condiviso una foto con te',
              imageUrl: 'https://picsum.photos/200',
            })
          }
          style={styles.button}
        >
          Mostra con immagine
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* With custom icon */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Con icona personalizzata
        </Text>
        <Button
          mode="contained"
          onPress={() =>
            showNotification({
              title: 'Aggiornamento disponibile',
              body: 'Una nuova versione è pronta per il download',
              icon: 'download',
            })
          }
          style={styles.button}
        >
          Mostra con icona
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* With action */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Con azione
        </Text>
        <Button
          mode="contained"
          onPress={() =>
            showNotification({
              title: 'Nuovo messaggio',
              body: 'Clicca per aprire la conversazione',
              icon: 'message-text',
              onPress: () => {
                alert('Navigazione alla conversazione!');
              },
            })
          }
          style={styles.button}
        >
          Mostra con azione
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* Short duration */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Durata breve (2s)
        </Text>
        <Button
          mode="contained"
          onPress={() =>
            showNotification({
              title: 'Operazione completata',
              body: 'Il file è stato salvato con successo',
              icon: 'check-circle',
              duration: 2000,
            })
          }
          style={styles.button}
        >
          Mostra breve
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* Long text */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Testo lungo
        </Text>
        <Button
          mode="contained"
          onPress={() =>
            showNotification({
              title: 'Titolo molto molto molto molto molto lungo che verrà troncato',
              body: 'Questo è un corpo di messaggio molto molto molto lungo che dovrebbe essere troncato a due righe per evitare di occupare troppo spazio sullo schermo',
              icon: 'text-long',
            })
          }
          style={styles.button}
        >
          Mostra testo lungo
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* Multiple notifications */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Notifiche multiple
        </Text>
        <Text variant="bodySmall" style={styles.sectionDescription}>
          Nota: solo l'ultima notifica sarà visibile (sovrascrive le precedenti)
        </Text>
        <Button
          mode="contained"
          onPress={() => {
            showNotification({
              title: 'Prima notifica',
              body: 'Questa sarà sostituita',
              duration: 10000,
            });
            setTimeout(() => {
              showNotification({
                title: 'Seconda notifica',
                body: 'Questa sostituisce la prima',
                duration: 10000,
              });
            }, 500);
          }}
          style={styles.button}
        >
          Mostra multiple
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* Different icons */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Icone diverse
        </Text>
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() =>
              showNotification({
                title: 'Errore',
                body: 'Qualcosa è andato storto',
                icon: 'alert-circle',
              })
            }
            style={styles.smallButton}
          >
            Errore
          </Button>
          <Button
            mode="outlined"
            onPress={() =>
              showNotification({
                title: 'Successo',
                body: 'Operazione completata',
                icon: 'check-circle',
              })
            }
            style={styles.smallButton}
          >
            Successo
          </Button>
          <Button
            mode="outlined"
            onPress={() =>
              showNotification({
                title: 'Info',
                body: 'Informazione importante',
                icon: 'information',
              })
            }
            style={styles.smallButton}
          >
            Info
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 16,
    opacity: 0.7,
  },
  divider: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    marginBottom: 8,
    opacity: 0.6,
  },
  button: {
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  smallButton: {
    flex: 1,
    minWidth: 100,
  },
});
