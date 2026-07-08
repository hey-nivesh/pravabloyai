import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Brand, Radius, Spacing } from '@/constants/theme';

type TrendLineChartProps = {
  title: string;
  values: number[];
  labels: string[];
  color: string;
  suffix?: string;
};

export function TrendLineChart({ title, values, labels, color, suffix = '' }: TrendLineChartProps) {
  const safeValues = values.length > 0 ? values : [0];
  const safeLabels = labels.length > 0 ? labels : ['-'];
  const [cardWidth, setCardWidth] = React.useState(0);
  const chartWidth = Math.max(220, cardWidth - Spacing.three * 2 - 12);

  return (
    <View
      style={styles.card}
      onLayout={(event) => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (nextWidth !== cardWidth) setCardWidth(nextWidth);
      }}
    >
      <Text style={styles.title}>{title}</Text>
      {cardWidth > 0 && (
        <LineChart
          data={{
            labels: safeLabels.slice(-7),
            datasets: [{ data: safeValues.slice(-7) }],
          }}
          width={chartWidth}
          height={180}
          yAxisSuffix={suffix}
          withInnerLines
          withOuterLines={false}
          chartConfig={{
            backgroundGradientFrom: Brand.cardBg,
            backgroundGradientTo: Brand.cardBg,
            decimalPlaces: 0,
            color: (opacity = 1) => `${color}${opacity < 1 ? 'CC' : ''}`,
            labelColor: () => Brand.grayText,
            propsForDots: {
              r: '3.5',
              strokeWidth: '2',
              stroke: color,
            },
            propsForBackgroundLines: {
              strokeDasharray: '4 8',
              stroke: 'rgba(107,114,128,0.22)',
              strokeWidth: 1,
            },
          }}
          bezier
          style={styles.chart}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(127, 34, 253, 0.12)',
    shadowColor: Brand.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    color: Brand.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  chart: {
    borderRadius: Radius.md,
  },
});

