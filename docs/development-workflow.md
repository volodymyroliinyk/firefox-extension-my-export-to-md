# Development workflow

## SDLC:

- coding
- automated tests, maximum test cases, maximal coverage
- code review, refactoring if it is necessary
- update [README.md](../README.md)
- update [CHANGELOG.md](../CHANGELOG.md)
- update [directory-tree.txt](../directory-tree.txt)
- `npm audit fix --force;`
- increase version [manifest.json](../manifest.json) and [package.json](../package.json)
- build (dev) release just for private manual testing:
  `(export AMO_JWT_ISSUER=...;export AMO_JWT_SECRET=...;);npm run build:dev;` (https://addons.mozilla.org/en-US/developers/addon/854438fecb2d45c1b7e4/versions)
- install to firefox browser (https://addons.mozilla.org/en-US/developers/addon/854438fecb2d45c1b7e4/versions)
- manual testing:
    - full page
    - selected element
    - check file name
    - check *.md file content
    - icon
- Git:
    - new branch,
    - commit all changes,
    - merge request,
    - set a release tag:
      ```
      git checkout main;
      git pull origin main;
      git tag -a 1.0.10 -m "Release 1.0.10";
      git push origin 1.0.10;
      ```
- build production release
- upload to firefox dev portal (https://addons.mozilla.org/en-US/developers/addon/myexporttomd/versions)
- waiting for an approval (https://addons.mozilla.org/en-US/developers/addon/myexporttomd/versions)
- install published production extension
- manual testing for officially released extension
- maintenance/updates/fixes if it is necessary

---

## Git

### Git hooks:

```.git/hooks/pre-commit
#!/usr/bin/env bash
branch="$(git branch --show-current)"

if [ "$branch" = "main" ]; then
echo "Direct commits to 'main' are blocked. Create a feature branch first." >&2
exit 1
fi
```
 
