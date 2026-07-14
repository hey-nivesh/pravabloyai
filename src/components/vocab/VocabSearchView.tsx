/**
 * VocabSearchView — Full-text search over the vocabulary_words corpus.
 *
 * Uses the existing `search_vocabulary_words` Postgres RPC function from the
 * 20260709_02_vocabulary_corpus.sql migration. No new server-side code needed.
 *
 * On viewing a word from search results:
 *  1. The word detail is shown with WordDetailView (both audio URLs, independently playable)
 *  2. The view is logged to user_word_history via revisitWord() so it counts as "seen"
 *     and won't be shown as "new" in the Daily tab again.
 *  3. "Save to Vault" is available on the detail view.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { revisitWord, saveWordToVault } from '@/services/vocabGeneration';
import { WordDetailView } from '@/components/vocab/WordDetailView';
import type { DailyWord, PartOfSpeech } from '@/hooks/use-daily-word';

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchResult = {
  id: string;
  word: string;
  part_of_speech: string | null;
  difficulty_level: string | null;
  is_enriched: boolean;
};

type EnrichedSearchWord = DailyWord & { isEnriched: boolean };

type VocabSearchViewProps = {
  lang: string;
  bottomPadding?: number;
};

// ─── Normalize a search result + enrichment into DailyWord shape ──────────────

function normalizeSearchWord(
  row: SearchResult,
  enrichment: Record<string, unknown> | null,
): EnrichedSearchWord {
  return {
    id: row.id,
    word: row.word,
    phonetic: String(enrichment?.phonetic_spelling ?? ''),
    partOfSpeech: (row.part_of_speech as PartOfSpeech) ?? 'noun',
    definition: String(enrichment?.definition ?? 'No definition available yet.'),
    exampleSentence: String(enrichment?.example_sentence ?? ''),
    usageTip: String(enrichment?.usage_tip ?? ''),
    source: 'curated',
    // Audio URLs stored in separate fields — never mixed
    audioUrl: (enrichment?.word_audio_url as string | undefined) ?? undefined,
    slowAudioUrl: (enrichment?.slow_word_audio_url as string | undefined) ?? undefined,
    exampleAudioUrl: (enrichment?.example_audio_url as string | undefined) ?? undefined,
    srsIntervalDays: 1,
    srsEaseFactor: 2.5,
    isEnriched: Boolean(row.is_enriched),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VocabSearchView({ lang, bottomPadding = 0 }: VocabSearchViewProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedWord, setSelectedWord] = useState<EnrichedSearchWord | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search ─────────────────────────────────────────────────────────────────

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_vocabulary_words', {
        search_query: q.trim(),
        result_limit: 20,
      });

      if (!error && data) {
        setResults(data as SearchResult[]);
      }
    } catch {
      // Swallow — search is non-critical
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setSelectedWord(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 350);
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setSelectedWord(null);
  };

  // ── Select a result ────────────────────────────────────────────────────────

  const handleSelectResult = async (result: SearchResult) => {
    setIsSaved(false);

    // Fetch enrichment for the selected word
    const { data: enrichmentRows } = await supabase
      .from('vocabulary_enrichment')
      .select('definition, phonetic_spelling, example_sentence, usage_tip, word_audio_url, example_audio_url, slow_word_audio_url')
      .eq('word_id', result.id)
      .eq('generated_language', lang)
      .maybeSingle();

    const word = normalizeSearchWord(result, enrichmentRows as Record<string, unknown> | null);
    setSelectedWord(word);

    // Log to user_word_history so it counts as "seen" — won't repeat in Daily
    revisitWord(result.id).catch(() => {});
  };

  const handleBack = () => {
    setSelectedWord(null);
  };

  // ── Save to Vault ──────────────────────────────────────────────────────────

  const handleSaveToVault = useCallback(async () => {
    if (!selectedWord || isSaved || isSaving) return;
    setIsSaving(true);
    try {
      await saveWordToVault(selectedWord.id);
      setIsSaved(true);
    } catch {
      // Non-fatal
    } finally {
      setIsSaving(false);
    }
  }, [selectedWord, isSaved, isSaving]);

  // ── Detail view ────────────────────────────────────────────────────────────

  if (selectedWord) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.detailContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable onPress={handleBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back to search results">
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={14}
            tintColor={Brand.primary}
          />
          <Text style={styles.backBtnText}>Search Results</Text>
        </Pressable>

        {/*
          WordDetailView — single component providing:
            - Word audio button (→ resolveWordAudioUrl → word_audio_url)
            - Example sentence audio button (→ resolveExampleAudioUrl → example_audio_url)
          No URL mixing possible.
        */}
        <WordDetailView
          word={selectedWord}
          lang={lang}
          showResponseButtons={false}
          onSaveToVault={handleSaveToVault}
          isSaved={isSaved}
          isSaving={isSaving}
        />
      </ScrollView>
    );
  }

  // ── Search list view ────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={16}
            tintColor={Brand.grayText}
          />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search 10,000+ words…"
            placeholderTextColor={Brand.grayText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search vocabulary words"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClearSearch} accessibilityLabel="Clear search">
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                size={16}
                tintColor={Brand.grayText}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Results */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.resultsContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isSearching && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color={Brand.primary} />
          </View>
        )}

        {!isSearching && query.length >= 2 && results.length === 0 && (
          <View style={styles.emptyResults}>
            <Text style={styles.emptyResultsText}>
              No words found for "{query}"
            </Text>
            <Text style={styles.emptyResultsHint}>
              Try the Daily tab — Gemini can generate words on any topic.
            </Text>
          </View>
        )}

        {query.length < 2 && !isSearching && (
          <View style={styles.searchPrompt}>
            <SymbolView
              name={{ ios: 'text.magnifyingglass', android: 'search', web: 'search' }}
              size={36}
              tintColor={Brand.primaryLight}
            />
            <Text style={styles.searchPromptTitle}>Search the Full Corpus</Text>
            <Text style={styles.searchPromptText}>
              Type at least 2 characters to search over the entire vocabulary corpus.
            </Text>
          </View>
        )}

        {results.map((result) => (
          <Pressable
            key={result.id}
            onPress={() => handleSelectResult(result)}
            style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${result.word}${result.is_enriched ? ', definition available' : ', not yet enriched'}`}
          >
            <View style={styles.resultLeft}>
              <Text style={styles.resultWord}>{result.word}</Text>
              {result.part_of_speech && (
                <Text style={styles.resultPos}>{result.part_of_speech}</Text>
              )}
            </View>
            <View style={styles.resultRight}>
              {result.is_enriched && (
                <View style={styles.enrichedBadge}>
                  <Text style={styles.enrichedBadgeText}>Defined</Text>
                </View>
              )}
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={12}
                tintColor={Brand.grayText}
              />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  searchBarWrapper: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.15)',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Brand.primaryDark,
    fontWeight: '500',
  },
  resultsContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailContent: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    alignSelf: 'flex-start',
    marginBottom: Spacing.two,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.primary,
  },
  searchingIndicator: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  emptyResultsText: {
    fontSize: 15,
    fontWeight: '600',
    color: Brand.primaryDark,
    textAlign: 'center',
  },
  emptyResultsHint: {
    fontSize: 13,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 18,
  },
  searchPrompt: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  searchPromptTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  searchPromptText: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(127, 34, 253, 0.08)',
    shadowColor: Brand.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resultRowPressed: {
    backgroundColor: Brand.primaryBadgeBg,
  },
  resultLeft: {
    flex: 1,
    gap: 2,
  },
  resultWord: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.primaryDark,
  },
  resultPos: {
    fontSize: 11,
    color: Brand.grayText,
    textTransform: 'capitalize',
  },
  resultRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  enrichedBadge: {
    backgroundColor: Brand.accentGreenLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  enrichedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Brand.accentGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
