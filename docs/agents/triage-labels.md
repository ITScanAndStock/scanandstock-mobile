# Triage Labels

The skills speak in terms of five canonical triage roles. In this repo's tracker (Notion, see `issue-tracker.md`) each role is a value of the `Statut` column, and the two "ready" roles are told apart by the `Qui` column. When a skill applies a role, set both columns of the row as below.

| Label in mattpocock/skills | Notion `Statut` | Notion `Qui` | Meaning                                  |
| -------------------------- | --------------- | ------------ | ---------------------------------------- |
| `needs-triage`             | À trier         | unchanged    | Maintainer needs to evaluate this issue  |
| `needs-info`               | Bloqué          | unchanged    | Waiting on reporter for more information |
| `ready-for-agent`          | Prêt            | Agent        | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | Prêt            | Robin        | Requires human implementation            |
| `wontfix`                  | Abandonné       | unchanged    | Will not be actioned                     |

A ticket reaches Prêt only after the two-agent review, with `Preuve de fin` and `Probable (j)` filled; otherwise it stays À trier and Robin is told. A ticket set to Bloqué gets its reason in its *Blocked by* section, and goes back to À trier when the information arrives.

The work states (En cours, En revue, Terminé) are set by the user-level skill `suivi-projet-notion`.
