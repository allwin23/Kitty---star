import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CompanionScheduler, type SynchronizationState } from '../animation-scheduler';
import { companionMascotService } from '../mascot.service';
import type { CompanionMascotState } from '../types';
import { CompanionBulletinBoard } from './bulletin-board';
import { CompanionMascot } from './companion-mascot';
import { fonts, glassCardStyle, palette, radius, spacing } from '@/theme';

export function CompanionStage() {
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
    <View style={styles.stageCard}>
      {/* Header Level & Personality bar */}
      <View style={styles.headerBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[8] }}>
          <Text style={{ fontFamily: fonts.accent, fontStyle: 'italic', fontWeight: '700', color: palette.textPrimary, fontSize: 16 }}>
            🐱 {mascotState.name}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={{ fontFamily: fonts.mono, color: palette.cherryBloom, fontSize: 11, fontWeight: '800' }}>
              LVL {mascotState.level}
            </Text>
          </View>
        </View>

        <Text style={{ color: palette.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
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
    ...glassCardStyle,
    borderRadius: radius.card,
    padding: spacing[16],
    gap: spacing[12],
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250, 215, 224, 0.5)',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: palette.blush,
    borderWidth: 1,
    borderColor: 'rgba(232, 77, 114, 0.2)',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
});

