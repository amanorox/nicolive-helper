#include "callVoiceUnder.h"

#include <Cocoa/Cocoa.h>


int callVoiceUnder(char*utf8str)
{
	NSString *myAppNotification;
	myAppNotification = [ [NSString alloc] initWithString : @"VoiceunderReadingMessageNamed" ];	// 通知名
	
	NSDistributedNotificationCenter *nCenter;
	nCenter = [ NSDistributedNotificationCenter defaultCenter ];
	
    NSString* str = [[NSString alloc] initWithUTF8String: utf8str];
	
	
	[ nCenter postNotificationName : myAppNotification
							object : str
						  userInfo : nil
						   options : NSNotificationDeliverImmediately ];
	
    //printf("%p,%p,%p\n",myAppNotification,nCenter,str);
    [str release];
    //[myAppNotification release];
    //[nCenter release];
    return 0;
}
