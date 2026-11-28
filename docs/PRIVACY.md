# Privacy

## User activity segmentation

OpenCupid records lightweight session timestamps (start time only) when users interact with the platform. No behavioral content is stored — sessions contain no IP addresses, device information, request paths, or event payloads.

These timestamps are distilled daily into a per-user activity summary that classifies each user into one of four segments: new, returning, frequent, or dormant. The summary stores only aggregate counts (active days and session count over the last 28 days) alongside the computed segment.

Raw session data is automatically deleted after 28 days. Activity summaries are deleted immediately when a user deletes their account.

The segment also affects where a profile appears in the browse grid: more active profiles rank higher, alongside distance, dating compatibility and a random shuffle. The segment itself, last-active times and the ranking score are never shown to other users or sent to the browser. Only the order of the list reflects them, and only coarsely.
