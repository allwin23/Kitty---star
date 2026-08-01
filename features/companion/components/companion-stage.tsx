import { useEffect, useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { CompanionScheduler, type SynchronizationState } from '../animation-scheduler';
import { companionMascotService } from '../mascot.service';
import type { CompanionMascotState } from '../types';
import { CompanionBulletinBoard } from './bulletin-board';
import { CompanionMascot } from './companion-mascot';
import { colors, radius, spacing } from '@/theme';

export function CompanionStage() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [syncState, setSyncState] = useState<SynchronizationState>(
    CompanionScheduler.getCurrentState(),
  );
  const [mascotState, setMascotState] = useState<CompanionMascotState>(
    companionMascotService.getMascotState(),
  );

  useEffect(() => {
    const unsubScheduler = CompanionScheduler.subscribe(setSyncState);
    const unsubMascot = companionMascotService.subscribe(setMascotState);

    return () => {
      unsubScheduler();
      unsubMascot();
    };
  }, []);

  return (
    <View
      style={[
        styles.stageCard,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      {/* Header Level & Personality bar */}
      <View style={styles.headerBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={{ fontWeight: '800', color: palette.text, fontSize: 13 }}>
            🐱 {mascotState.name}
          </Text>
          <View style={[styles.levelBadge, { backgroundColor: `${palette.primary}20` }]}>
            <Text style={{ color: palette.primary, fontSize: 10, fontWeight: '800' }}>
              LVL {mascotState.level}
            </Text>
          </View>
        </View>

        <Text style={{ color: palette.mutedText, fontSize: 11, fontStyle: 'italic' }}>
          Mode: {mascotState.personalityMode}
        </Text>
      </View>

      {/* Main Presentation Stage */}
      <View style={styles.mainRow}>
        {/* Companion Mascot */}
        <CompanionMascot
          pose={syncState.mascotPose}
          emotion={syncState.mascotEmotion}
          skin={mascotState.activeSkin}
          decoration={mascotState.activeDecoration}
          size={64}
        />

        {/* Synchronized Bulletin Board */}
        <View style={{ flex: 1 }}>
          <CompanionBulletinBoard
            announcement={syncState.activeAnnouncement}
            typingText={syncState.typingText}
            isTyping={syncState.isTyping}
            queueCount={syncState.queueCount}
            onDismiss={() => CompanionScheduler.dismissActive()}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stageCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
