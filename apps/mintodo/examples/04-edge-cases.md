# あらゆる edge case を踏むボード

# (parse: 25 nodes, roundtrip: OK)

# Edge cases @priority:high

- [ ] 特殊文字を含むテキスト
  - [ ] [角括弧] と @at と #hash を含むタスク
  - [ ] 絵文字入りタスク
- [ ] wip の特殊グリフ
  - [-] 進行中タスク @status:wip
  - [|] レビュー待ち @status:review
  - [x] 完了タスク @done
- [x] 複数属性の組み合わせ @priority:high @color:emerald @due:2026-12-31 @estimate:8 @done
- [-] 色違いのタスク @status:wip
  - [ ] 通常 @color:slate
  - [ ] 緊急 @priority:high @color:rose
  - [ ] アイデア @color:sky
  - [ ] 財務 @color:emerald
- [ ] 優先度バリエーション
  - [ ] 高優先 @priority:high
  - [ ] 中優先 @priority:medium
  - [ ] 低優先 @priority:low
- [-] 深いネスト @status:wip
  - [-] レベル1 @status:wip
    - [-] レベル2 @status:wip
      - [-] レベル3 @status:wip
        - [-] レベル4 @status:wip
          - [-] レベル5 @status:wip
            - [-] レベル6 @status:wip
              - [ ] レベル7 (leaf)
                - 2026-06-26 10:00: もう限界
