import type { ReactNode } from 'react';
import { Platform, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AnimatedWavingHand } from './animated-waving-hand';

type HeaderTitleCardProps = {
  title: string;
  subtitle?: string;
  showWavingHand?: boolean;
  rightAction?: ReactNode;
  badgeText?: string;
  style?: StyleProp<ViewStyle>;
};

export function HeaderTitleCard({
  title,
  subtitle,
  showWavingHand = false,
  rightAction,
  badgeText,
  style,
}: HeaderTitleCardProps) {
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: 'rgba(18, 18, 24, 0.90)',
          borderColor: 'rgba(255, 255, 255, 0.18)',
          borderWidth: 1,
          borderRadius: 999,
          paddingHorizontal: 28,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        Platform.OS === 'web' &&
          ({
            elevation: 4,
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          } as any),
        style,
      ]}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {badgeText ? (
          <View
            style={{
              backgroundColor: 'rgba(240, 115, 146, 0.20)',
              borderColor: 'rgba(240, 115, 146, 0.40)',
              borderWidth: 1,
              paddingHorizontal: 10,
              paddingVertical: 2,
              borderRadius: 10,
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                color: '#F07392',
                fontSize: 9,
                fontWeight: '800',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              {badgeText}
            </Text>
          </View>
        ) : null}

        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: -0.3,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
          {showWavingHand ? <AnimatedWavingHand size={26} /> : null}
        </View>

        {subtitle ? (
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.72)',
              fontSize: 12,
              fontWeight: '500',
              textAlign: 'center',
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ? <View style={{ marginTop: 6 }}>{rightAction}</View> : null}
    </View>
  );
}
