import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File as ExpoFile } from "expo-file-system";
import type { AttachmentTicket, AuthSession, FormMessage, MeProfile } from "../types";

type UseAvatarUploadParams = {
  session: AuthSession | null;
  relayFetch: <T>(session: AuthSession, path: string, init?: RequestInit) => Promise<T>;
  setProfile: (profile: MeProfile | null) => void;
  setSessionMessage: (message: FormMessage | null) => void;
};

async function uploadBytes(uploadUrl: string, mimeType: string, bytes: ArrayBuffer) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": mimeType },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Avatar upload failed.");
  }
}

export function useAvatarUpload({
  session,
  relayFetch,
  setProfile,
  setSessionMessage,
}: UseAvatarUploadParams) {
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const changeAvatar = useCallback(async () => {
    if (!session) return;
    setIsUploadingAvatar(true);
    setSessionMessage(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSessionMessage({
          tone: "warning",
          title: "Photo access is still blocked",
          body: "Allow gallery access so EmberChamber can update your profile picture.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
        allowsEditing: false,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets.length) return;

      const asset = result.assets[0];
      const squareEdge =
        typeof asset.width === "number" && typeof asset.height === "number"
          ? Math.min(asset.width, asset.height)
          : 0;
      const avatarManipulations: ImageManipulator.Action[] = squareEdge
        ? [
            {
              crop: {
                originX: Math.floor((asset.width - squareEdge) / 2),
                originY: Math.floor((asset.height - squareEdge) / 2),
                width: squareEdge,
                height: squareEdge,
              },
            },
            { resize: { width: 400, height: 400 } },
          ]
        : [{ resize: { width: 400 } }];

      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        avatarManipulations,
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      const file = new ExpoFile(manipulated.uri);
      const fileBytes = await file.bytes();
      const mimeType = "image/jpeg";

      const ticket = await relayFetch<AttachmentTicket>(session, "/v1/attachments/ticket", {
        method: "POST",
        body: JSON.stringify({
          fileName: `avatar-${Date.now()}.jpg`,
          mimeType,
          byteLength: fileBytes.byteLength,
          contentClass: "image",
          retentionMode: "private_vault",
          protectionProfile: "standard",
          encryptionMode: "none",
        }),
      });

      await uploadBytes(
        ticket.uploadUrl,
        mimeType,
        fileBytes.buffer.slice(fileBytes.byteOffset, fileBytes.byteOffset + fileBytes.byteLength),
      );

      await relayFetch<MeProfile>(session, "/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ avatarAttachmentId: ticket.attachmentId }),
      });

      const nextProfile = await relayFetch<MeProfile>(session, "/v1/me");
      setProfile(nextProfile);
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Avatar upload failed",
        body: error instanceof Error ? error.message : "Unable to update profile picture.",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [session, relayFetch, setProfile, setSessionMessage]);

  return { changeAvatar, isUploadingAvatar };
}
