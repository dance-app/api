// Setup: Workspace with owner + +1 member + 1 registered user (not member) + 1 unregistered members
// 1. Owner schedules new event
// 2. Owner sends invitation to 5 registered members
// 3. Owner sends invitation to 1 email address (unregistered user)
// 4. Unauthenticated user can get details about event
// 5. Registered user can become attendee
// 6. The number of attendee has increases (5 + 1 + 1)
// 7.

// 3. members list their invitations
// 4. Uninvited users get 403 when accessing the event
// 5. Invited member can see the details of the event
// 6. invited memeber get notification
// 7. invited member updates his attendance status
// 8. owner sees the attendance of the event be updated
// 9. owner ads 5 unregistered members
