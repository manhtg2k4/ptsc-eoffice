import React from "react";
import PropTypes from "prop-types";
import {
  NewsItemWrapper,
  NewsAvatar,
  NewsTitle,
  NewsDateText,
  NewsLikesText,
  NewsCommentsText,
  getGradientByColor,
	StyledStack,
	StyledBoxDashboard,
} from "@styles/DashboardPage.styles";

const NewsItem = ({ data, onClick }) => {
  return (
    <NewsItemWrapper onClick={onClick} styleCursor={onClick}>
      <NewsAvatar
        variant="rounded"
        styledBgColor={getGradientByColor(data.color || "blue")}
      >
        {data.emoji}
      </NewsAvatar>

      <StyledBoxDashboard>
        <NewsTitle>{data.title}</NewsTitle>

        <StyledStack direction="row" spacing={1.25} useFlexGap>
          <NewsDateText>{data.date}</NewsDateText>
          <NewsLikesText>{data.likes}</NewsLikesText>
          <NewsCommentsText>{data.comments}</NewsCommentsText>
        </StyledStack>
      </StyledBoxDashboard>
    </NewsItemWrapper>
  );
};

NewsItem.propTypes = {
	data: PropTypes.shape({
    color: PropTypes.string,
    emoji: PropTypes.string,
    title: PropTypes.string,
    date: PropTypes.string,
    likes: PropTypes.number,
    comments: PropTypes.number,
  }).isRequired,
};

export default NewsItem;
