#include "IYukkuroid.h"
#include "YukkuroidRPCClinet.h"

void yukkuroidSetText(char*utf8)
{
	[YukkuroidRPCClinet setKanjiText:utf8];
	return;
}

int isYukkuroidSaying()
{
	[YukkuroidRPCClinet isStillPlaying:(int)0];
	return 0;
}

int yukkuroidPlay()
{
	[YukkuroidRPCClinet playSync:(int)0];
	return 0;
}
