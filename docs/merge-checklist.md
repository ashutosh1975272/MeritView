# F1 Merge Checklist (Stage 1.6)

## Pre-Merge Checks
- [ ] All CI checks pass on develop branch
- [ ] Unit test coverage >= 80% for auth-related files
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Lint passes (`npm run lint`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Security review sign-off from AppSec Engineer
- [ ] Identity & Access review sign-off from I&A Engineer
- [ ] Legal/compliance sign-off obtained
- [ ] Staging deployment verified

## Merge Process
1. Create PR from `develop` to `main`
2. Request reviews from required engineers
3. Address all review comments
4. Re-run CI after changes
5. Squash and merge using:
   ```bash
   gh pr merge --squash --delete-branch
   ```
6. Tag release:
   ```bash
   git tag -a v0.1.0-auth -m "F1 Auth complete"
   git push origin v0.1.0-auth
   ```

## Post-Merge
- [ ] Deploy to staging environment
- [ ] Smoke test auth flow on staging
- [ ] Monitor staging for 24 hours
- [ ] Document completion in plan.md change log
- [ ] Update project checklist
- [ ] Notify team of merge
- [ ] Archive feature branch
- [ ] Create new develop branch from updated main
