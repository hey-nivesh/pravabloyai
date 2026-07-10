import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CASE_STUDIES, CATEGORY_COLORS } from '@/constants/case-studies';
import { Brand, Radius, Spacing } from '@/constants/theme';

type VoiceQuickStartSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function VoiceQuickStartSheet({ visible, onClose }: VoiceQuickStartSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSelect = (caseStudyId: string) => {
    onClose();
    router.push(`/session/${caseStudyId}` as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close scenario picker" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Start a voice session</Text>
        <Text style={styles.subtitle}>Pick a scenario to jump straight into live practice.</Text>

        <View style={styles.list}>
          {CASE_STUDIES.map((study) => {
            const cat = CATEGORY_COLORS[study.category];
            return (
              <Pressable
                key={study.id}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => handleSelect(study.id)}
                accessibilityRole="button"
                accessibilityLabel={`Start ${study.title}`}
              >
                <View style={[styles.badge, { backgroundColor: cat.bg }]}>
                  <Text style={[styles.badgeText, { color: cat.text }]}>{cat.label}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {study.title}
                  </Text>
                  <Text style={styles.rowMeta}>{study.durationMin} min · {study.difficulty}</Text>
                </View>
                <SymbolView
                  name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }}
                  size={18}
                  tintColor={Brand.primary}
                />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [styles.allBtn, pressed && styles.allBtnPressed]}
          onPress={() => {
            onClose();
            router.push('/practice' as never);
          }}
          accessibilityRole="button"
          accessibilityLabel="Browse all practice scenarios"
        >
          <Text style={styles.allBtnText}>Browse all scenarios</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 14, 158, 0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Brand.cardBg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
    ...Platform.select({
      web: { maxWidth: 520, alignSelf: 'center' },
      default: {},
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(127, 34, 253, 0.2)',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.primaryDark,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 13,
    color: Brand.grayText,
    marginBottom: Spacing.three,
    lineHeight: 18,
  },
  list: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two + 2,
    borderRadius: Radius.md,
    backgroundColor: Brand.primaryBadgeBg,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.1)',
  },
  rowPressed: {
    opacity: 0.85,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  rowMeta: {
    fontSize: 11,
    color: Brand.grayText,
    fontWeight: '500',
  },
  allBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(127, 34, 253, 0.08)',
  },
  allBtnPressed: {
    opacity: 0.8,
  },
  allBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.primary,
  },
});
