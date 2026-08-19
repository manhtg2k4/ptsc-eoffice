import styled from 'styled-components'

export const TreeNodeWrapper = styled.div`
  width: 100%;
  .rst__tree {
    background-color: #f5f5f5;
    border-radius: 4px;
    padding: 16px;
  }

  .rst__node {
    padding: 8px 0;
  }

  .rst__node.rst__leaf {
    padding-left: 24px;
  }

  .rst__nodeContent {
    padding: 8px 12px;
    background-color: #e3f2fd;
    border-radius: 4px;
    border-left: 4px solid #1976d2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 40px;
    margin-right: 8px;
  }

  .rst__node.rst__expanded > .rst__nodeContent {
    background-color: #bbdefb;
  }

  .rst__dragHandlerIcon {
    display: none;
  }

  .rst__loadingIcon {
    color: #1976d2;
  }

  .rst__collapseButton {
    width: 24px;
    height: 24px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 16px;
      height: 16px;
    }
  }

  .rst__connectingLine {
    border-color: #bdbdbd;
  }
`

export const TreeNodeContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`

export const TreeNodeLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: #212121;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    color: #1565c0;
  }
`

export const TreeNodeActions = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;

  button {
    opacity: 0.6;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 1;
    }
  }
`

export const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
  border-radius: 4px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.08);
    color: #1976d2;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`
