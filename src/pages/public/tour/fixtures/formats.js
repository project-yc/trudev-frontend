// Sample questions for the non-coding formats, in the shape QuestionStage
// takes (`{ item_attempt_id, points, question: {...} }`). Shown interactively
// in the tour's "More formats" chapter; the dev-only /__exam-preview harness
// uses the same items.

export const SAMPLE_MCQ_SINGLE = {
  item_attempt_id: 'a1',
  points: 2,
  question: {
    prompt: `Consider a distributed system architecture where multiple nodes need to reach a consensus on a specific state change despite network partitions and potential node failures. You are implementing a simplified version of the Raft consensus algorithm.

Which of the following scenarios best describes a situation where a new Leader will definitively be elected in a cluster of 5 nodes?`,
    selection_mode: 'single',
    options: [
      { id: 1, text: 'The current Leader crashes, and two remaining nodes receive votes from 2 nodes each simultaneously.' },
      { id: 2, text: 'A network partition separates the Leader from the rest of the cluster; 3 nodes form a new majority and one times out, initiating an election.' },
      { id: 3, text: 'The Leader is operational but experiences high latency; followers continue to receive heartbeats just before their election timeouts expire.' },
      { id: 4, text: 'Every node simultaneously increments its term and votes for itself.' },
    ],
  },
};

export const SAMPLE_MCQ_MULTI = {
  item_attempt_id: 'a2',
  points: 3,
  question: {
    prompt: 'Select every statement that is true about HTTP caching headers.',
    selection_mode: 'multi',
    options: [
      { id: 1, text: 'ETag enables conditional requests via If-None-Match' },
      { id: 2, text: 'Cache-Control: no-store prevents any storage of the response' },
      { id: 3, text: 'Expires takes precedence over Cache-Control: max-age' },
      { id: 4, text: 'Vary tells caches which request headers affect the response' },
    ],
  },
};

export const SAMPLE_FREE_TEXT = [
  {
    item_attempt_id: 'f1',
    points: 5,
    question: {
      prompt: 'A teammate opens a pull request that adds a 400ms blocking call to your checkout path. Walk through how you would raise this, and what you would propose instead.',
      word_limit: 300,
    },
  },
  {
    item_attempt_id: 'f2',
    points: 4,
    question: {
      prompt: 'Describe a time you shipped something that broke in production. What did you change about how you work afterwards?',
      word_limit: null,
    },
  },
];

export const SAMPLE_RANKING = {
  item_attempt_id: 'r1',
  points: 4,
  question: {
    prompt: 'A production incident has just been declared. Rank these actions from first to last.',
    options: [
      { id: 1, text: 'Acknowledge the page and declare an incident channel' },
      { id: 2, text: 'Roll back the most recent deploy' },
      { id: 3, text: 'Write the customer-facing status update' },
      { id: 4, text: 'Open a post-incident review document' },
      { id: 5, text: 'Confirm the blast radius from dashboards' },
    ],
  },
};
