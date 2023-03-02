**Subscribe to ANY**
You can subscribe a function to run on ANY published Event, making the EventHandler "agnostic" to which Event was published to it. This is used for applications such as Events to Firehose or Events to Kinesis, where the same logic is applied to multiple events.

**Subscribing multiple functions to a single Event**
Should a single Event Handler subscribe two functions to the same event? The answer is NO.
Reason: Let's say that an event was published to SNS and then consumed by a single Event Handler. It will now execute two functions. What happens if one fails and the second succeeds? A retry of course.. but retries are already handled by SNS so it will be redundant to code another retry mechanism. And if a retry occurs by SNS, it will execute the two subscribed functions again, although one of them succeeded before.

In this case, do one of the following:
1. Subscribe a function that publishes two events concurrently. 
2. Create two Events Handlers (The better option)

***Event***   
Event is a JSON object that consists of:    
*EVENT_NAME* - a unique system-wide event name (string)    
*EVENT_VERSION* - (semantic versioning), currently linked to the EventHandler package version. TODO: // separate to another independent version 
*EVENT_ID* - A unique system-wide ID (TBD, currently GUID)    
*IS_TRIGGER* - A trigger event is defined as the first event in a chain reaction of events (had no preceding event)    
*EVENT_TIMESTAMP* - When event has occurred (Unix timestamp)    
*HAS_ALERT* - Alert level for event, such as WARN and ERR (for later filtering and analysis). Every event that starts with ERR_ his level is set to ERR, and every event that starts with WARN_ his level is set to WARN.    
*PAYLOAD* - A JSON object with data relevant to a specific EVENT_NAME. (This is the unstructured part of the Event)    
    

**EventContext**:    
An Event Context is the "where, when and why" the Event was created. It includes the following fields:    
*EVENT_USER_ID* - a unique ID identifying to which user this event relates to.    
*EVENT_DEVICE_ID* - a unique ID identifying to which physical device this event relates to.    
*EVENT_HOUSEHOLD_ID* - A unique ID identifying to which household this event relates to.    
*INITIAL_EVENT_ID* - A unique Event ID that identifies which event triggered this event.    
*EVENT_SOURCE_TYPE* - Which app/source has generated this event    
*EVENT_SOURCE_VERSION* - It's version    
*EVENT_OS* - Which OS the app/source is running on    
*EVENT_OS_VERSION* - Which OS version the app/source is running on 

**Context**   
Context is a way to encapsulate Event producing and publishing for an event handling ("context handling") function. EventHandler v1 had a major fault, that each time a creation of a new event was required, you had to pass the preceding event to the emitEvent function. That required the developer to pass/drag down events through all the layers/classes/function, in order to retain the INITIAL_EVENT_ID.  Context holds the Event and exposes only one function emitEvent which creates another Context via 

**ContextFactory**.    
    
TODO: Context is also expected to handle sessions.    
    
Context Factory creates Context out of Event and also publishes an event through the **iPubSub** (SRP issue here: by definition of Event Driven Development each event created should also be published. To let a developer have the option to create an Event and NOT publish it - is a big no. But if Context Factory also creates Events so it should also publish them. But its name and responsibility suggests that it only creates Contexts, not publishing 

**Context, Events and iPubSub**   
iPubSub passes Events. Context is an applicative wrapper around an Event for an EventHandler to use. Thus you'll notice that when registering an event handling function, you are registering a Context handling function, and registerEventHandler() is wrapping incoming Events with Contexts which are then passed to the registered context handling function.

    
**iPubSub**
The PubSub interface is in place because an EventHandler / developer / should be agnostic to how Events are passed between EventHandlers. In production, SNS is used, but SNS can not be used for development and SNS may also be replaced with another PubSub / Message Broker. For development purposes, there is also the LocalPubSub that passes Event locally using EventEmitter2.    
    
iPubSub exposes two functions:    
  
subscribe(EVENT_NAME, eventHandlingFunction) - to subscribe an Event handling function that will be invoked each time an Event with EVENT_NAME is received.    
  
publish(EVENT_NAME, EVENT) - to publish EVENT to a topic named EVENT_NAME    