/**
 * WordHistoryList — Scrollable list of every word the user has ever seen.
 *
 * Each row shows: word text, "Saved" chip if is_saved_to_vault, last-viewed date.
 * Tapping a row expands it into a full WordDetailView with both audio buttons
 * playable independently (word pronunciation + example sentence audio).
 *
 * Uses useWordHistory hook — paginated, with load-more at bottom.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useWordHistory } from '@/hooks/useWordHistory';
import { saveWordToVault } from '@/services/vocabGeneration';
import { WordDetailView } from '@/components/vocab/WordDetailView';
import type { WordHistoryItem } from '@/services/vocabGeneration';
import type { MasteryResponse } from '@/hooks/use-daily-word';

// ─── Types ────────────────────────────────────────────────────────────────────

type WordHistoryListProps = {
  lang: string;
  /** Outer scroll container content padding bottom */
  bottomPadding?: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WordHistoryList({ lang, bottomPadding = 0 }: WordHistoryListProps) {
  const { status, items, hasMore, error, loadHistory, loadMore, markRevisited } = useWordHistory();
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);
  const [savedWordIds, setSavedWordIds] = useState<Set<string>>(new Set());
  const [savingWordId, setSavingWordId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Pre-populate saved set from loaded items
  useEffect(() => {
    const saved = new Set(items.filter((i) => i.isSavedToVault).map((i) => i.id));
    setSavedWordIds(saved);
  }, [items]);

  const handleRowPress = useCallback(
    (item: WordHistoryItem) => {
      const isExpanding = expandedWordId !== item.id;
      setExpandedWordId(isExpanding ? item.id : null);

      // Mark as revisited on expand (not on collapse)
      if (isExpanding) {
        markRevisited(item.id);
      }
    },
    [expandedWordId, markRevisited],
  );

  const handleSaveToVault = useCallback(
    async (wordId: string) => {
      if (savedWordIds.has(wordId) || savingWordId === wordId) return;
      setSavingWordId(wordId);
      try {
        await saveWordToVault(wordId);
        setSavedWordIds((prev) => new Set([...prev, wordId]));
      } catch {
        // Non-fatal
      } finally {
        setSavingWordId(null);
      }
    },
    [savedWordIds, savingWordId],
  );

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Brand.primary} />
        <Text style={styles.loadingText}>Loading your word history…</Text>
      </View>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <SymbolView
          name={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }}
          size={32}
          tintColor={Brand.accentAmber}
        />
        <Text style={styles.errorText}>{error ?? 'Failed to load history.'}</Text>
        <Pressable onPress={loadHistory} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'ready' && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <SymbolView
          name={{ ios: 'books.vertical', android: 'book', web: 'book' }}
          size={40}
          tintColor={Brand.grayText}
        />
        <Text style={styles.emptyTitle}>No words yet</Text>
        <Text style={styles.emptySubtitle}>
          Words you discover in the Daily tab will appear here — nothing is ever lost.
        </Text>
      </View>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item) => {
        const isExpanded = expandedWordId === item.id;
        const isSaved = savedWordIds.has(item.id);
        const isSavingThis = savingWordId === item.id;

        return (
          <View key={item.historyId} style={styles.itemWrapper}>
            {/* ── Row (always visible) ─────────────────────────────────────── */}
            <Pressable
              onPress={() => handleRowPress(item)}
              style={({ pressed }) => [
                styles.row,
                isExpanded && styles.rowExpanded,
                pressed && styles.rowPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.word}. ${isSaved ? 'Saved to Vault.' : ''} Tap to ${isExpanded ? 'collapse' : 'expand'}.`}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.rowWord} numberOfLines={1}>
                  {item.word}
                </Text>
                <Text style={styles.rowPhonetic} numberOfLines={1}>
                  {item.phonetic}
                </Text>
              </View>

              <View style={styles.rowRight}>
                {isSaved && (
                  <View style={styles.savedChip}>
                    <Text style={styles.savedChipText}>Saved</Text>
                  </View>
                )}
                <Text style={styles.rowDate}>{formatDate(item.lastViewedAt)}</Text>
                <SymbolView
                  name={isExpanded
                    ? { ios: 'chevron.up', android: 'keyboard_arrow_up', web: 'keyboard_arrow_up' }
                    : { ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }
                  }
                  size={12}
                  tintColor={Brand.grayText}
                />
              </View>
            </Pressable>

            {/* ── Expanded detail view ─────────────────────────────────────── */}
            {isExpanded && (
              <View style={styles.expandedCard}>
                {/*
                  WordDetailView is the single component that always provides both:
                    - Word audio button (→ resolveWordAudioUrl → word_audio_url)
                    - Example audio button (→ resolveExampleAudioUrl → example_audio_url)
                  No audio-URL mixing is possible here.
                */}
                <WordDetailView
                  word={item}
                  lang={lang}
                  showResponseButtons={false}
                  onSaveToVault={() => handleSaveToVault(item.id)}
                  isSaved={isSaved}
                  isSaving={isSavingThis}
                />
              </View>
            )}
          </View>
        );
      })}

      {/* ── Load more ──────────────────────────────────────────────────────── */}
      {hasMore && (
        <Pressable
          onPress={loadMore}
          style={styles.loadMoreBtn}
          disabled={status === 'loading_more'}
        >
          {status === 'loading_more' ? (
            <ActivityIndicator size="small" color={Brand.primary} />
          ) : (
            <Text style={styles.loadMoreText}>Load more</Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
    gap: Spacing.three,
  },
  loadingText: {
    fontSize: 14,
    color: Brand.grayText,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Brand.primaryDark,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.md,
    backgroundColor: Brand.primaryBadgeBg,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.2)',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
  },
  itemWrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.08)',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 34, 253, 0.08)',
  },
  rowPressed: {
    backgroundColor: Brand.primaryBadgeBg,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowWord: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  rowPhonetic: {
    fontSize: 12,
    color: Brand.grayText,
    fontWeight: '400',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  savedChip: {
    backgroundColor: Brand.accentGreenLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  savedChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.accentGreen,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  rowDate: {
    fontSize: 11,
    color: Brand.grayText,
    fontWeight: '500',
  },
  expandedCard: {
    paddingVertical: Spacing.four,
    gap: Spacing.four,
  },
  loadMoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: Brand.primaryBadgeBg,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.15)',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.primary,
  },
});
