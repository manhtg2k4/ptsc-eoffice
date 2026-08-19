import { CardContent, Typography } from "@mui/material";
import {
  ChartCard,
  ChartContainer,
  ChartTitle,
  ChartWrapper,
  LegendColorBox,
  LegendContainer,
  LegendItem,
  LegendLabel,
  SingleLegendBox,
  StyleBoxNoData,
  StyleTypographyNoData,
  TooltipBox,
} from "@styles/Dashboard/Dasboard.style";
import { memo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function CustomTooltip(props) {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    return (
      <TooltipBox>
        <Typography variant="body2">
          <strong>{payload[0].name}:</strong> {payload[0].value} (
          {payload[0].payload.percentage}%)
        </Typography>
      </TooltipBox>
    );
  }
  return null;
}

function PieChartCard(props) {
  const { title, data, showLegend } = props;
  const [, setActiveIndex] = useState(null);
  const [hiddenItems, setHiddenItems] = useState([]);
  const [explodedItems, setExplodedItems] = useState([]);

  function handleMouseEnter(_, index) {
    setActiveIndex(index);
  }

  function handleMouseLeave() {
    setActiveIndex(null);
  }

  function handlePieClick(_, index) {
    setExplodedItems((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [...prev, index];
    });
  }

  function handleLegendClick(index) {
    setHiddenItems((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      return [...prev, index];
    });
  }

  function handleLegendMouseEnter(index) {
    if (!hiddenItems.includes(index)) {
      setActiveIndex(index);
    }
  }

  function handleLegendMouseLeave() {
    setActiveIndex(null);
  }

  const visibleData = data.filter((_, index) => !hiddenItems.includes(index));

  const getLegendItemClick = (index) => () => handleLegendClick(index);
  const getLegendItemMouseEnter = (index) => () =>
    handleLegendMouseEnter(index);
  const handleLegendItemClick = () => {
    handleLegendClick(0);
  };

  return (
    <>
      {data?.length === 0 ? (
        <>
          <ChartCard elevation={2}>
            <CardContent>
              <ChartTitle variant="h6">{title}</ChartTitle>
            </CardContent>
          <StyleBoxNoData>
            <StyleTypographyNoData variant="body2">
              Biểu đồ hiện không có dữ liệu
            </StyleTypographyNoData>
          </StyleBoxNoData>
          </ChartCard>

        </>
      ) : (
        <ChartCard elevation={2}>
          <CardContent>
            <ChartTitle variant="h6">{title}</ChartTitle>

            <>
              {showLegend ? (
                <LegendContainer>
                  {data
                    .filter((entry) => entry.value !== 0)
                    .map((entry) => {
                      const originalIndex = data.indexOf(entry);
                      const isHidden = hiddenItems.includes(originalIndex);
                      return (
                        <LegendItem
                          key={originalIndex}
                          onClick={getLegendItemClick(originalIndex)}
                          onMouseEnter={getLegendItemMouseEnter(originalIndex)}
                          onMouseLeave={handleLegendMouseLeave}
                          isHidden={isHidden}
                        >
                          <LegendLabel>
                            <LegendColorBox
                              boxColor={entry.color}
                              isHidden={isHidden}
                            />
                            <Typography variant="caption">
                              {entry.name} ({entry.value})
                            </Typography>
                          </LegendLabel>
                        </LegendItem>
                      );
                    })}
                </LegendContainer>
              ) : data.length === 1 && data[0].value !== 0 ? (
                <SingleLegendBox
                  onClick={handleLegendItemClick}
                  isHidden={hiddenItems.includes(0)}
                >
                  <LegendColorBox
                    boxColor={data[0].color}
                    isHidden={hiddenItems.includes(0)}
                  />
                  <Typography variant="caption">
                    {data[0].name} ({data[0].value}) - {data[0].percentage}%
                  </Typography>
                </SingleLegendBox>
              ) : null}
            </>

            <ChartContainer>
              <ChartWrapper>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={visibleData}
                      cx="50%"
                      cy="50%"
                      startAngle={90}
                      endAngle={450}
                      innerRadius={0}
                      outerRadius={100}
                      paddingAngle={0}
                      dataKey="value"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      onClick={handlePieClick}
                      cursor="pointer"
                      activeIndex={explodedItems}
                      activeShape={{
                        outerRadius: 110,
                        stroke: "#fff",
                        strokeWidth: 1,
                      }}
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                      isAnimationActive
                    >
                      {visibleData.map((entry) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={entry.color}
                          // stroke={entry.color}
                          // strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </ChartContainer>
          </CardContent>
        </ChartCard>
      )}
    </>
  );
}

PieChartCard.displayName = "PieChartCard";

export default memo(PieChartCard);
