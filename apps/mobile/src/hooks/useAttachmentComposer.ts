import { useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File as ExpoFile } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { MAX_ATTACHMENT_BYTES } from "../constants";
import type { FormMessage, PendingAttachment } from "../types";

type UseAttachmentComposerParams = {
  setPendingAttachment: (attachment: PendingAttachment | null) => void;
  setSessionMessage: (message: FormMessage | null) => void;
  setIsPickingPhoto: (value: boolean) => void;
};

/**
 * Owns the outgoing-attachment composer surface: choosing a photo/video from the
 * library, capturing one with the camera, or picking an arbitrary file. Each
 * action normalizes the asset into a `PendingAttachment` (resizing + recompressing
 * images, enforcing the 20 MB beta cap) and reports failures through the shared
 * session-message channel.
 *
 * Extracted from App.tsx as the first step of the mobile modularization plan
 * (`useAttachmentComposer`). Behavior is unchanged from the inline implementation.
 */
export function useAttachmentComposer({
  setPendingAttachment,
  setSessionMessage,
  setIsPickingPhoto,
}: UseAttachmentComposerParams) {
  const buildPendingAttachmentFromAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset): Promise<PendingAttachment> => {
      const assetFile = new ExpoFile(asset.uri);
      const inferredMimeType =
        asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg");
      const inferredByteLength = asset.fileSize ?? assetFile.size ?? 0;
      const isVideo =
        asset.type === "video" || inferredMimeType.startsWith("video/");

      if (isVideo) {
        if (inferredByteLength > MAX_ATTACHMENT_BYTES) {
          throw new Error("That video exceeds the 20 MB beta attachment limit.");
        }

        return {
          uri: asset.uri,
          fileName: asset.fileName ?? `video-${Date.now()}.mp4`,
          mimeType: inferredMimeType,
          byteLength: inferredByteLength,
          width: asset.width,
          height: asset.height,
        } satisfies PendingAttachment;
      }

      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [
          {
            resize: {
              width: asset.width > asset.height ? 1920 : undefined,
              height: asset.height >= asset.width ? 1920 : undefined,
            },
          },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );

      const manipulatedFile = new ExpoFile(manipulated.uri);
      const byteLength =
        manipulatedFile.size ||
        Math.floor(manipulated.width * manipulated.height * 0.3);
      if (byteLength > MAX_ATTACHMENT_BYTES) {
        throw new Error("That photo exceeds the 20 MB beta attachment limit.");
      }

      return {
        uri: manipulated.uri,
        fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
        byteLength,
        width: manipulated.width,
        height: manipulated.height,
      } satisfies PendingAttachment;
    },
    [],
  );

  const pickPhoto = useCallback(async () => {
    setIsPickingPhoto(true);
    setSessionMessage(null);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSessionMessage({
          tone: "warning",
          title: "Media access is still blocked",
          body: "Allow photo and video access so EmberChamber can attach media to the conversation.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      setPendingAttachment(await buildPendingAttachmentFromAsset(asset));
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Media picker failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to open the media library.",
      });
    } finally {
      setIsPickingPhoto(false);
    }
  }, [
    buildPendingAttachmentFromAsset,
    setIsPickingPhoto,
    setPendingAttachment,
    setSessionMessage,
  ]);

  const takePhoto = useCallback(async () => {
    setIsPickingPhoto(true);
    setSessionMessage(null);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setSessionMessage({
          tone: "warning",
          title: "Camera access is still blocked",
          body: "Allow camera access so EmberChamber can capture a photo or video.",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.85,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const asset = result.assets[0];
      setPendingAttachment(await buildPendingAttachmentFromAsset(asset));
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "Camera capture failed",
        body:
          error instanceof Error ? error.message : "Unable to capture media.",
      });
    } finally {
      setIsPickingPhoto(false);
    }
  }, [
    buildPendingAttachmentFromAsset,
    setIsPickingPhoto,
    setPendingAttachment,
    setSessionMessage,
  ]);

  const pickFile = useCallback(async () => {
    setIsPickingPhoto(true);
    setSessionMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets.length) return;
      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_ATTACHMENT_BYTES) {
        setSessionMessage({
          tone: "error",
          title: "File too large",
          body: "Keep attachments under 20 MB for the beta relay path.",
        });
        return;
      }
      setPendingAttachment({
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType ?? "application/octet-stream",
        byteLength: asset.size ?? 0,
      });
    } catch (error) {
      setSessionMessage({
        tone: "error",
        title: "File picker failed",
        body:
          error instanceof Error
            ? error.message
            : "Unable to open the file picker.",
      });
    } finally {
      setIsPickingPhoto(false);
    }
  }, [setIsPickingPhoto, setPendingAttachment, setSessionMessage]);

  return { pickPhoto, takePhoto, pickFile };
}
