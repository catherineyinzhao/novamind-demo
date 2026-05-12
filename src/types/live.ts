export type FeedBlock =
  | {
      id: string
      kind: 'thinking' | 'tool' | 'tool_result' | 'text' | 'result'
      title: string
      body: string
    }

export type ObsLine = {
  id: string
  text: string
  tone: 'lf' | 'bt' | 'ok' | 'err' | 'neutral'
}
