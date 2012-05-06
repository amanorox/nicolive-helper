#include "nsINLHSafariCookie.h"
#include "safaricookie.h"

int GetSafariNicoSessionCookie(char *buf, int len)
{
	getnicocookie(buf,len);
    return 0;
}
