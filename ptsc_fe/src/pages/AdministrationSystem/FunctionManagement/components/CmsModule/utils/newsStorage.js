// Simple localStorage-backed counts and per-user interaction tracking for demo
const READ_KEY = "cms_news_counts"; // maps id -> { reads, likes }
const USER_READS_KEY = "cms_news_user_reads"; // set of ids this user read
const USER_LIKES_KEY = "cms_news_user_likes"; // set of ids this user liked

function _loadCounts() {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "{}");
  } catch (e) {
    return {};
  }
}
function _saveCounts(map) {
  localStorage.setItem(READ_KEY, JSON.stringify(map));
}
function _loadSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch (e) {
    return new Set();
  }
}
function _saveSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

export function getCounts(id) {
  const m = _loadCounts();
  const v = m[id] || { reads: 0, likes: 0 };
  return { ...v };
}

export function markRead(id) {
  const userReads = _loadSet(USER_READS_KEY);
  if (userReads.has(id)) return getCounts(id);
  userReads.add(id);
  _saveSet(USER_READS_KEY, userReads);

  const m = _loadCounts();
  m[id] = { reads: (m[id]?.reads || 0) + 1, likes: m[id]?.likes || 0 };
  _saveCounts(m);
  return m[id];
}

export function hasLiked(id) {
  const userLikes = _loadSet(USER_LIKES_KEY);
  return userLikes.has(id);
}

export function toggleLike(id) {
  const userLikes = _loadSet(USER_LIKES_KEY);
  const m = _loadCounts();
  const current = m[id] || { reads: 0, likes: 0 };
  if (userLikes.has(id)) {
    userLikes.delete(id);
    current.likes = Math.max(0, (current.likes || 1) - 1);
  } else {
    userLikes.add(id);
    current.likes = (current.likes || 0) + 1;
  }
  m[id] = current;
  _saveCounts(m);
  _saveSet(USER_LIKES_KEY, userLikes);
  return { likes: current.likes };
}
