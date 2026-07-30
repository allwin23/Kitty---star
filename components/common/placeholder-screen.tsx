import { Text } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { typography } from '@/theme';

type PlaceholderScreenProps = { title: string };

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <Screen centered>
      <Text style={typography.heading}>{title}</Text>
    </Screen>
  );
}
