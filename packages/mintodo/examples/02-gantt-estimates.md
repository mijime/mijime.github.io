# Gantt ビュー用の階層的な見積もり付きボード

# (parse: 11 nodes, roundtrip: OK)

# Web アプリ再構築

- [-] Phase 1: MVP @status:wip
  - [-] 認証機能 @status:wip @estimate:16
    - [ ] OAuth 統合
      - 2026-06-26 10:49: Google
      - 2026-06-26 10:49: GitHub
    - [x] メール/パスワード @estimate:4 @done
      - 2026-06-01 10:00: 実装完了
      - 2026-06-02 15:30: テスト通過
  - [-] データモデル @status:wip @estimate:8
    - [x] Prisma スキーマ @done
      - 2026-05-28 14:00: 完成
  - [ ] API エンドポイント @estimate:24
- [-] Phase 2: ベータリリース @status:wip
  - [ ] パフォーマンス改善 @priority:high @estimate:12
  - [ ] E2E テスト @estimate:16
- [ ] Phase 3: GA
