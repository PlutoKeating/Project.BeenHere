import type { InterviewMessage, RecordDraft } from "../types";

export type InterviewPhase = "active" | "complete";

export interface AutomatedInterviewState {
  phase: InterviewPhase;
  completionReason: "finished" | "stopped" | "safety" | null;
  startedAt: string;
  questionIndex: number;
  awaitingFollowUp: boolean;
  messages: InterviewMessage[];
}

const QUESTIONS = [
  "先从现在说起吧。最近，你在过怎样的日子？",
  "最近有没有一件很小、但你还记得的事？",
  "这段日子里，有没有什么让你觉得不容易？不想回答也可以跳过。",
  "如果回头看，你觉得自己最近有一点变化吗？",
  "你对接下来有什么期待？可以很具体，也可以只是一个方向。",
  "最后，你希望偶然读到这份记录的人，记住你说过的哪句话？",
] as const;

interface InterviewRule {
  key: string;
  rank: number;
  decompositions: Array<{ pattern: RegExp; reassemble: (captures: RegExpMatchArray) => string }>;
}

const TOPIC_RULES: InterviewRule[] = [
  { key: "relationship", rank: 40, decompositions: [{ pattern: /(朋友|家人|父母|妈妈|爸爸|伴侣|同学|老师)/, reassemble: (captures) => `你提到“${captures[1]}”。这段关系最近让你感受到什么？` }] },
  { key: "work-study", rank: 30, decompositions: [{ pattern: /(工作|上班|学校|上学|考试|学习|毕业|搬家)/, reassemble: (captures) => `说到“${captures[1]}”，这件事最近最具体的一个瞬间是什么？` }] },
  { key: "creative-life", rank: 20, decompositions: [{ pattern: /(画画|绘画|写作|摄影|音乐|唱歌|跳舞|漫画|动漫|游戏|阅读|看书|电影)/, reassemble: (captures) => `你提到“${captures[1]}”。它为什么会留在你的日子里？` }] },
  { key: "place", rank: 10, decompositions: [{ pattern: /(旅行|散步|公园|家乡|城市|房间|咖啡店)/, reassemble: (captures) => `“${captures[1]}”听起来对你有一点特别。你愿意多讲一个细节吗？` }] },
];

const SENSITIVE_PATTERN = /(抑郁|休学|退学|家暴|霸凌|暴力|性侵|虐待|离婚|去世|死亡|失业|欠债|疾病|住院)/;
const IMMEDIATE_DANGER_PATTERN = /(想|要|准备|打算|正在).{0,4}(自杀|轻生|伤害自己)|活不下去|不想活了/;
const SKIP_PATTERN = /^(跳过|不想说|不回答|换一个|下一题|pass)$/i;

function interviewer(body: string): InterviewMessage {
  return { speakerRole: "interviewer", body };
}

function participant(body: string): InterviewMessage {
  return { speakerRole: "participant", body };
}

function nextQuestion(state: AutomatedInterviewState, prefix?: string): AutomatedInterviewState {
  const questionIndex = state.questionIndex + 1;
  if (questionIndex >= QUESTIONS.length) {
    return {
      ...state,
      phase: "complete",
      completionReason: "finished",
      questionIndex,
      awaitingFollowUp: false,
      messages: [...state.messages, ...(prefix ? [interviewer(prefix)] : []), interviewer("谢谢你把这些话留在这里。采访到这里结束；在保存之前，你仍然可以逐条检查、修改或删除。")],
    };
  }
  return {
    ...state,
    questionIndex,
    awaitingFollowUp: false,
    messages: [...state.messages, ...(prefix ? [interviewer(prefix)] : []), interviewer(QUESTIONS[questionIndex]!)],
  };
}

function contextualFollowUp(answer: string): string | null {
  const rankedRules = TOPIC_RULES
    .filter((rule) => rule.decompositions.some(({ pattern }) => pattern.test(answer)))
    .sort((left, right) => right.rank - left.rank);
  for (const rule of rankedRules) {
    for (const decomposition of rule.decompositions) {
      const captures = answer.match(decomposition.pattern);
      if (captures) return decomposition.reassemble(captures);
    }
  }
  return null;
}

export function beginInterview(now = new Date()): AutomatedInterviewState {
  return {
    phase: "active",
    completionReason: null,
    startedAt: now.toISOString(),
    questionIndex: 0,
    awaitingFollowUp: false,
    messages: [
      interviewer("你好，我是来过的自动采访程序。我会按固定提纲提问，并根据你刚才的话做一次简短追问。"),
      interviewer(QUESTIONS[0]),
    ],
  };
}

export function submitInterviewAnswer(state: AutomatedInterviewState, rawAnswer: string): AutomatedInterviewState {
  if (state.phase !== "active") return state;
  const answer = rawAnswer.trim();
  if (!answer) return state;
  if (SKIP_PATTERN.test(answer)) return nextQuestion(state, "好，我们跳过这题。");

  const answered = { ...state, messages: [...state.messages, participant(answer)] };
  if (IMMEDIATE_DANGER_PATTERN.test(answer)) {
    return {
      ...answered,
      phase: "complete",
      completionReason: "safety",
      awaitingFollowUp: false,
      messages: [
        ...answered.messages,
        interviewer("我不会继续追问或把这当作采访素材。这个程序不能提供危机支持。"),
        interviewer("如果你正处在危险中，请现在联系身边可信任的人、当地紧急服务或能够提供现实帮助的专业人员。"),
      ],
    };
  }
  if (SENSITIVE_PATTERN.test(answer)) {
    return nextQuestion(answered, "谢谢你愿意说到这里。你不需要解释原因，也可以随时跳过或结束采访。");
  }
  if (!state.awaitingFollowUp) {
    const followUp = contextualFollowUp(answer);
    if (followUp) {
      return { ...answered, awaitingFollowUp: true, messages: [...answered.messages, interviewer(followUp)] };
    }
  }
  return nextQuestion(answered, state.awaitingFollowUp ? "谢谢你补充这个细节。" : "我记下了。");
}

export function finishInterview(state: AutomatedInterviewState): AutomatedInterviewState {
  if (state.phase === "complete") return state;
  return {
    ...state,
    phase: "complete",
    completionReason: "stopped",
    awaitingFollowUp: false,
    messages: [...state.messages, interviewer("好，我们就停在这里。只有你确认后，这段对话才会进入未公开记录。")],
  };
}

export function interviewToDraft(state: AutomatedInterviewState): RecordDraft {
  if (state.phase !== "complete") throw new Error("采访尚未结束，不能整理为记录。");
  if (state.completionReason === "safety") throw new Error("采访因安全原因停止，不能整理为记录。");
  return {
    participant: { displayName: "", identityMode: "pseudonym" },
    conductedAt: state.startedAt,
    messages: state.messages.map(({ speakerRole, body }) => ({ speakerRole, body })),
    source: { sourceType: "direct", platformName: "来过 · 自动采访" },
  };
}
