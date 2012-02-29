#include "IYukkuroid.h"
#include "YukkuroidRPCClinet.h"

void yukkuroidSetText(char*utf8)
{
	NSString *myNSString  = [NSString stringWithUTF8String:utf8];
	[YukkuroidRPCClinet setKanjiText:myNSString];
	[myNSString release];
	return;
}

int32_t isYukkuroidSaying(int32_t n)
{
	return [YukkuroidRPCClinet isStillPlaying:(int)n];
}

int32_t yukkuroidPlay()
{
	[YukkuroidRPCClinet pushPlayButton:(int)0];
	return 0;
}
