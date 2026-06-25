const CLOSED_STAGE_NAMES = new Set(["won", "lost", "closed won", "closed lost"]);

export const getStageName = (stageId, lifecycleStages = []) => {
  return lifecycleStages.find((stage) => stage.id === stageId)?.name || "";
};

export const isClosedStage = (stageId, lifecycleStages = []) => {
  const stageName = getStageName(stageId, lifecycleStages).trim().toLowerCase();
  return CLOSED_STAGE_NAMES.has(stageName);
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

export const applyClosedStageRules = ({ payload, nextStage, previousStage, lifecycleStages = [] }) => {
  if (!isClosedStage(nextStage, lifecycleStages)) {
    return payload;
  }

  if (!previousStage) {
    return {
      ...payload,
      remind_at: null,
      expected_close_date: payload.expected_close_date || getTodayDate(),
    };
  }

  if (previousStage !== nextStage) {
    return {
      ...payload,
      remind_at: null,
      expected_close_date: getTodayDate(),
    };
  }

  return {
    ...payload,
    remind_at: null,
  };
};