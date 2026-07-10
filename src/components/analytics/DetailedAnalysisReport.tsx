import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Radius, Spacing } from '@/constants/theme';
import type { AnalyticsReport, SessionAnalysisPayload } from '@/services/analysis';

type Props = {
  report: AnalyticsReport;
  analysis: SessionAnalysisPayload | null;
};

function ScoreBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.scoreBadge}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function DetailedAnalysisReport({ report, analysis }: Props) {
  const fluencyScore = Math.round(
    Number(report?.fluency_score ?? report?.score ?? analysis?.fluency_score ?? 0),
  );
  const confidenceScore = Math.round(Number(report?.confidence_score ?? analysis?.confidence_score ?? 0));
  const wpm = Math.round(Number(report?.wpm ?? analysis?.wpm ?? 0));
  const fillerCount = Math.round(
    Number(report?.filler_word_count ?? report?.filler_count ?? analysis?.filler_word_count ?? 0),
  );

  const grammar = report?.grammar_gaps ?? report?.grammar_corrections ?? analysis?.grammar_gaps ?? [];
  const strengths = analysis?.strengths ?? report?.strengths ?? [];
  const improvements = analysis?.improvement_areas ?? report?.improvement_areas ?? [];
  const vocabTips = analysis?.vocabulary_tips ?? [];
  const solutions = analysis?.improvement_solutions ?? [];
  const pacingSolutions = analysis?.pacing_solutions ?? [];
  const fillerSolutions = analysis?.filler_word_solutions ?? [];
  const pronunciationDrills = analysis?.pronunciation_drills ?? [];
  const actionPlan = analysis?.fluency_action_plan ?? [];
  const nextGoals = analysis?.next_session_goals ?? [];
  const overall = analysis?.overall_evaluation ?? report?.vocab_feedback ?? '';
  const scenarioAdvice = analysis?.scenario_specific_advice ?? '';
  const pacingFeedback = analysis?.pacing_feedback ?? '';

  return (
    <View style={styles.results}>
      <View style={styles.heroCard}>
        <Text style={styles.heroScore}>{fluencyScore}%</Text>
        <Text style={styles.heroLabel}>Fluency score</Text>
        <Text style={styles.heroSummary}>{overall || 'Your personalized coach summary is ready.'}</Text>
      </View>

      <View style={styles.scoreRow}>
        <ScoreBadge label="Confidence" value={`${confidenceScore}%`} />
        <ScoreBadge label="WPM" value={`${wpm}`} />
        <ScoreBadge label="Fillers" value={`${fillerCount}`} />
        <ScoreBadge label="Tier" value={analysis?.lexicon_tier_rank ?? '—'} />
      </View>

      {!!scenarioAdvice && (
        <SectionCard title="Scenario coaching">
          <Text style={styles.bodyText}>{scenarioAdvice}</Text>
        </SectionCard>
      )}

      {solutions.length > 0 && (
        <SectionCard title="Solutions & practice drills">
          {solutions.map((item, idx) => (
            <View key={`sol-${idx}`} style={styles.solutionCard}>
              <Text style={styles.solutionArea}>{item.area}</Text>
              <Text style={styles.evidenceLabel}>What we noticed</Text>
              <Text style={styles.bodyText}>{item.evidence}</Text>
              <Text style={styles.solutionLabel}>How to fix it</Text>
              <Text style={styles.bodyText}>{item.solution}</Text>
              <Text style={styles.drillLabel}>Practice drill</Text>
              <Text style={styles.drillText}>{item.practice_drill}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {actionPlan.length > 0 && (
        <SectionCard title="Your 3-step fluency action plan">
          {actionPlan.map((step) => (
            <View key={`step-${step.step}`} style={styles.actionStep}>
              <Text style={styles.stepNumber}>Step {step.step}</Text>
              <Text style={styles.solutionArea}>{step.goal}</Text>
              <Text style={styles.bodyText}>{step.how_to_practice}</Text>
              <Text style={styles.successText}>✓ Success: {step.success_criteria}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {!!analysis?.pronunciation_feedback && (
        <SectionCard title="Pronunciation analysis">
          <Text style={styles.bodyText}>{analysis.pronunciation_feedback}</Text>
          {pronunciationDrills.map((drill, idx) => (
            <View key={`pron-${idx}`} style={styles.drillCard}>
              <Text style={styles.solutionArea}>{drill.focus}</Text>
              <Text style={styles.bodyText}>{drill.instruction}</Text>
              <Text style={styles.vocabAlt}>Try: "{drill.example_phrase}"</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {(!!pacingFeedback || pacingSolutions.length > 0) && (
        <SectionCard title="Pacing & flow">
          {!!pacingFeedback && <Text style={styles.bodyText}>{pacingFeedback}</Text>}
          {pacingSolutions.map((tip, idx) => (
            <Text key={`pace-${idx}`} style={styles.bulletText}>• {tip}</Text>
          ))}
        </SectionCard>
      )}

      {fillerSolutions.length > 0 && (
        <SectionCard title="Filler word solutions">
          {fillerSolutions.map((tip, idx) => (
            <Text key={`filler-${idx}`} style={styles.bulletText}>• {tip}</Text>
          ))}
        </SectionCard>
      )}

      {!!analysis?.vocabulary_feedback && (
        <SectionCard title="Vocabulary analysis">
          <Text style={styles.bodyText}>{analysis.vocabulary_feedback}</Text>
        </SectionCard>
      )}

      <SectionCard title="Grammar corrections">
        {Array.isArray(grammar) && grammar.length > 0 ? (
          grammar.map((item, idx) => (
            <View key={`g-${idx}`} style={styles.grammarCard}>
              <Text style={styles.grammarOriginal}>"{item.original}"</Text>
              <Text style={styles.grammarArrow}>→ "{item.corrected}"</Text>
              {!!item.explanation && (
                <Text style={styles.bodyText}>{item.explanation}</Text>
              )}
              {!!item.practice_sentence && (
                <Text style={styles.practiceText}>
                  Say 5×: "{item.practice_sentence}"
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.bulletText}>• No major grammar corrections were flagged.</Text>
        )}
      </SectionCard>

      <SectionCard title="Strengths">
        {(strengths.length > 0 ? strengths : ['Active participation in the conversation.']).map(
          (item, idx) => (
            <Text key={`s-${idx}`} style={styles.bulletText}>• {item}</Text>
          ),
        )}
      </SectionCard>

      <SectionCard title="Focus areas">
        {(improvements.length > 0
          ? improvements
          : ['Reduce fillers and complete sentences before pausing.']
        ).map((item, idx) => (
          <Text key={`i-${idx}`} style={styles.bulletText}>• {item}</Text>
        ))}
      </SectionCard>

      {vocabTips.length > 0 && (
        <SectionCard title="Vocabulary upgrades">
          {vocabTips.map((tip, idx) => (
            <View key={`v-${idx}`} style={styles.vocabTip}>
              <Text style={styles.vocabTerm}>{tip.term}</Text>
              <Text style={styles.bodyText}>{tip.meaning}</Text>
              <Text style={styles.vocabAlt}>Say: "{tip.standardAlternative}"</Text>
              {!!tip.usage_example && (
                <Text style={styles.usageExample}>Example: {tip.usage_example}</Text>
              )}
            </View>
          ))}
        </SectionCard>
      )}

      {nextGoals.length > 0 && (
        <SectionCard title="Goals for your next session">
          {nextGoals.map((goal, idx) => (
            <Text key={`goal-${idx}`} style={styles.bulletText}>• {goal}</Text>
          ))}
        </SectionCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  results: { gap: Spacing.three },
  heroCard: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  heroScore: { fontSize: 48, fontWeight: '800', color: Brand.primaryDark },
  heroLabel: { fontSize: 13, fontWeight: '600', color: Brand.grayText, marginTop: 4 },
  heroSummary: {
    fontSize: 14,
    color: Brand.grayText,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Spacing.two,
  },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  scoreBadge: {
    minWidth: '47%',
    backgroundColor: Brand.cardBg,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  scoreLabel: { color: Brand.grayText, fontSize: 11, fontWeight: '600' },
  scoreValue: { color: Brand.primaryDark, fontSize: 18, fontWeight: '800' },
  sectionCard: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
  },
  sectionTitle: { color: Brand.primaryDark, fontSize: 14, fontWeight: '700', marginBottom: Spacing.one },
  bodyText: { color: Brand.grayText, fontSize: 13, lineHeight: 20, marginTop: 4 },
  bulletText: { color: Brand.grayText, fontSize: 13, lineHeight: 20, marginTop: 6 },
  solutionCard: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 34, 253, 0.08)',
    gap: 4,
  },
  solutionArea: { color: Brand.primaryDark, fontSize: 14, fontWeight: '700' },
  evidenceLabel: { color: Brand.grayText, fontSize: 11, fontWeight: '600', marginTop: 6, textTransform: 'uppercase' },
  solutionLabel: { color: Brand.primary, fontSize: 11, fontWeight: '600', marginTop: 6, textTransform: 'uppercase' },
  drillLabel: { color: '#059669', fontSize: 11, fontWeight: '600', marginTop: 6, textTransform: 'uppercase' },
  drillText: { color: Brand.primaryDark, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  actionStep: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 34, 253, 0.08)',
  },
  stepNumber: { color: Brand.primary, fontSize: 12, fontWeight: '700' },
  successText: { color: '#059669', fontSize: 12, fontWeight: '600', marginTop: 6 },
  drillCard: {
    marginTop: Spacing.two,
    padding: Spacing.two,
    backgroundColor: 'rgba(127, 34, 253, 0.04)',
    borderRadius: Radius.md,
  },
  grammarCard: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 34, 253, 0.08)',
  },
  grammarOriginal: { color: '#DC2626', fontSize: 13, fontStyle: 'italic' },
  grammarArrow: { color: '#059669', fontSize: 13, fontWeight: '600', marginTop: 4 },
  practiceText: {
    color: Brand.primaryDark,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    backgroundColor: 'rgba(127, 34, 253, 0.06)',
    padding: Spacing.two,
    borderRadius: Radius.sm,
  },
  vocabTip: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(127, 34, 253, 0.08)',
  },
  vocabTerm: { color: Brand.primaryDark, fontSize: 14, fontWeight: '700' },
  vocabAlt: { color: Brand.primary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  usageExample: { color: Brand.grayText, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
});
