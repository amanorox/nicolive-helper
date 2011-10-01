#ifndef ICOMMENTTALKER_H_DEF
#define ICOMMENTTALKER_H_DEF


typedef unsigned short PRUnichar;

#ifdef __cplusplus
extern "C" {
#endif
	
	int saykotoeri(const PRUnichar *text);
	int saykotoeri2(const PRUnichar*option, const PRUnichar *text);
	int bouyomichan(const PRUnichar *execpath, const PRUnichar *text);

#ifdef __cplusplus
};
#endif

#endif
