# Project.BeenHere Domain

Project.BeenHere preserves interviews that happen on external platforms as durable, structured, publicly readable records. External platforms remain the place where encounters and community interaction happen; this system owns the archive.

## People and interviews

**Person Record**:
The enduring record of one interviewed person across one or more interviews. It is not a social profile and carries no popularity metrics.
_Avoid_: User profile, creator page, account

**Interview**:
One bounded conversation with a person at a known time. An interview owns its source material and can have multiple published editions.
_Avoid_: Article, post, archive

**Message Unit**:
The smallest ordered piece of an interview, such as a question, answer, image, pause, note, or section marker.
_Avoid_: Block, message, paragraph

**Published Edition**:
An immutable, numbered snapshot of an interview approved for public reading. Later corrections create a new edition; they never overwrite an earlier edition silently.
_Avoid_: Version, article revision

**Archive Number**:
The stable public identifier assigned to an interview when its first edition is published.
_Avoid_: Person number, post ID

## Evidence and editing

**Source Record**:
A reference to where an interview occurred, normally a Douyin post or private chat, plus captured evidence and provenance metadata.
_Avoid_: Imported post, original article

**Source Evidence**:
Restricted raw material used to verify a Source Record, including screenshots, exports, images, audio, and hashes. Source Evidence is not public by default.
_Avoid_: Public attachment, archive asset

**Editorial Draft**:
Mutable working material produced from Source Evidence before participant approval and publication.
_Avoid_: Unpublished edition

**Editorial Note**:
A public explanation of material editing, redaction, reconstruction, or uncertainty.
_Avoid_: Admin comment

**Redaction**:
A recorded decision to hide specific personal or sensitive information from public projections while preserving the reason and authorized audit trail.
_Avoid_: Deletion, censorship

## Authority and rights

**Participant**:
The person whose life and words are preserved by an Interview. A Participant may use a real name, pseudonym, or anonymous presentation.
_Avoid_: Subject, content source

**Consent Grant**:
A recorded statement defining what material may be processed, published, attributed, and retained, for what scope and duration.
_Avoid_: Checkbox, blanket authorization

**Correction Request**:
A request from a Participant or reader to correct, clarify, redact, attribute, or withdraw published material.
_Avoid_: Wiki edit, comment

**Withdrawal**:
Removal of an Interview or specific material from public access. A non-identifying tombstone may remain; restricted evidence follows the applicable retention decision.
_Avoid_: Silent deletion

## Discovery

**Drift**:
An intentionally non-ranked random encounter with an eligible Published Edition.
_Avoid_: Recommendation, feed

**Topic**:
An editorially maintained concept connecting interviews without ranking people or implying identity.
_Avoid_: Hashtag, category leaderboard

**Public Projection**:
A read model of one Published Edition rendered as Story, Conversation, or Record. It never becomes an independent source of truth.
_Avoid_: Separate article
