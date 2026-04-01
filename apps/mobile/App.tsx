import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { startTransition, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type MagicLinkResponse = {
  id: string;
  expiresAt: string;
  inviteRequired: boolean;
  debugCompletionToken?: string;
};

const relayUrl = "http://10.0.2.2:8787";

async function bootstrapLocalStore() {
  const db = await SQLite.openDatabaseAsync("emberchamber.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS relay_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      title TEXT,
      epoch INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

export default function App() {
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("Android beta device");
  const [isBooting, setIsBooting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [challenge, setChallenge] = useState<MagicLinkResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    startTransition(() => {
      void (async () => {
        await bootstrapLocalStore();
        const [savedEmail, savedInvite] = await Promise.all([
          SecureStore.getItemAsync("pm_last_email"),
          SecureStore.getItemAsync("pm_last_invite"),
        ]);

        if (mounted) {
          if (savedEmail) {
            setEmail(savedEmail);
          }
          if (savedInvite) {
            setInviteToken(savedInvite);
          }
          setIsBooting(false);
        }
      })();
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function submitMagicLink() {
    setIsSending(true);
    try {
      const response = await fetch(`${relayUrl}/v1/auth/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          inviteToken: inviteToken || undefined,
          deviceLabel,
        }),
      });

      const body = (await response.json()) as MagicLinkResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to start sign-in");
      }

      await Promise.all([
        SecureStore.setItemAsync("pm_last_email", email),
        SecureStore.setItemAsync("pm_last_invite", inviteToken),
      ]);

      setChallenge(body);
    } catch (error) {
      Alert.alert("Magic link failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsSending(false);
    }
  }

  if (isBooting) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#91f3d8" />
        <Text style={styles.loadingText}>Preparing your encrypted local store…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Android-first beta</Text>
        <Text style={styles.title}>Invite-only private messaging</Text>
        <Text style={styles.subtitle}>
          EmberChamber uses email magic links for bootstrap and keeps your message history on-device.
          The relay stores only ciphertext envelopes, public key bundles, and delivery metadata.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Join the beta</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#8ba1a3"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            autoCapitalize="none"
            placeholder="Invite token"
            placeholderTextColor="#8ba1a3"
            style={styles.input}
            value={inviteToken}
            onChangeText={setInviteToken}
          />
          <TextInput
            placeholder="This device name"
            placeholderTextColor="#8ba1a3"
            style={styles.input}
            value={deviceLabel}
            onChangeText={setDeviceLabel}
          />
          <Pressable
            disabled={isSending || !email.trim()}
            onPress={() => void submitMagicLink()}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSending) && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonLabel}>
              {isSending ? "Sending link…" : "Send magic link"}
            </Text>
          </Pressable>
          <Text style={styles.helper}>
            Email stays private. It is used only for auth and recovery, never for discovery.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Beta constraints</Text>
          <Text style={styles.bullet}>• DMs and small groups only</Text>
          <Text style={styles.bullet}>• 12 members maximum per group</Text>
          <Text style={styles.bullet}>• 2 linked devices per account</Text>
          <Text style={styles.bullet}>• Android, Windows, and Ubuntu only for the first beta</Text>
        </View>

        {challenge ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Check your inbox</Text>
            <Text style={styles.helper}>
              Your magic link expires at {new Date(challenge.expiresAt).toLocaleString()}.
            </Text>
            {challenge.debugCompletionToken ? (
              <Text selectable style={styles.debugToken}>
                Dev completion token: {challenge.debugCompletionToken}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#071116",
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#071116",
    gap: 12,
  },
  loadingText: {
    color: "#eaf4f4",
    fontSize: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 16,
  },
  eyebrow: {
    color: "#91f3d8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#f7fafc",
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
  },
  subtitle: {
    color: "#b6c8cc",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 560,
  },
  card: {
    backgroundColor: "#0f1a21",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#17303a",
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    color: "#f7fafc",
    fontSize: 18,
    fontWeight: "600",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#254451",
    backgroundColor: "#12232c",
    color: "#f7fafc",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#88f1d5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonLabel: {
    color: "#041318",
    fontSize: 16,
    fontWeight: "700",
  },
  helper: {
    color: "#97a8ad",
    fontSize: 14,
    lineHeight: 20,
  },
  bullet: {
    color: "#dbe8ea",
    fontSize: 15,
    lineHeight: 22,
  },
  debugToken: {
    color: "#91f3d8",
    fontSize: 13,
    lineHeight: 20,
  },
});
