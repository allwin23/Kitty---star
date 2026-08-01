import { useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export interface ProofViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  caption?: string | null;
  onClose: () => void;
}

export function ProofViewerModal({
  visible,
  imageUrl,
  caption,
  onClose,
}: ProofViewerModalProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [scale, setScale] = useState(1);

  if (!imageUrl) return null;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 0.75));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  const handleToggleZoom = () => {
    setScale((prev) => (prev === 1 ? 2.2 : 1));
  };

  const handleDownloadOrOpen = async () => {
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.target = '_blank';
        link.download = `proof-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        await Linking.openURL(imageUrl);
      }
    } catch (e) {
      console.error('Failed to open image link:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Header toolbar */}
        <View style={[styles.header, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={[typography.title, { color: palette.text, fontSize: 15 }]} numberOfLines={1}>
              {caption || 'Proof Image'}
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 11 }}>
              Zoom: {Math.round(scale * 100)}%
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsGroup}>
            <Pressable
              style={({ pressed }) => [styles.toolBtn, { backgroundColor: palette.surface }, pressed && { opacity: 0.7 }]}
              onPress={handleZoomOut}
            >
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>–</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.toolBtn, { backgroundColor: palette.surface }, pressed && { opacity: 0.7 }]}
              onPress={handleResetZoom}
            >
              <Text style={{ color: palette.text, fontSize: 12, fontWeight: '600' }}>1x</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.toolBtn, { backgroundColor: palette.surface }, pressed && { opacity: 0.7 }]}
              onPress={handleZoomIn}
            >
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>+</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.downloadBtn, { backgroundColor: palette.primary }, pressed && { opacity: 0.8 }]}
              onPress={handleDownloadOrOpen}
            >
              <Text style={{ color: palette.primaryText, fontSize: 12, fontWeight: '700' }}>
                {Platform.OS === 'web' ? 'Download ⤓' : 'Open / Save ↗'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>✕</Text>
            </Pressable>
          </View>
        </View>

        {/* Scrollable image container */}
        <ScrollView
          contentContainerStyle={styles.imageScrollContainer}
          maximumZoomScale={4}
          minimumZoomScale={0.5}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          horizontal
        >
          <ScrollView
            contentContainerStyle={styles.imageScrollContainer}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={handleToggleZoom} style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: 320 * scale,
                  height: 480 * scale,
                  borderRadius: radius.md,
                }}
                resizeMode="contain"
              />
            </Pressable>
          </ScrollView>
        </ScrollView>

        {/* Footer tip */}
        <View style={styles.footer}>
          <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
            Tap image to toggle zoom • Use + / – buttons or download for original resolution
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 23, 0.95)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 48 : spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    paddingHorizontal: spacing.sm,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  imageScrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  footer: {
    padding: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : spacing.md,
    alignItems: 'center',
  },
});
