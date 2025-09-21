import DuelRequest from "./models/DuelRequest.js";

const createDuelRequest = async (fromUserId, toUserId, postId) => {
  const duelRequest = new DuelRequest({
    fromUserId,
    toUserId,
    postId,
  });

  await duelRequest.save();
  return duelRequest;
};
