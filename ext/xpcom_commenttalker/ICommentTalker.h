/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM d:\sources\firefox\xpcom_commenttalker\ICommentTalker.idl
 */

#ifndef __gen_ICommentTalker_h__
#define __gen_ICommentTalker_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    INLHCommentTalker */
#define INLHCOMMENTTALKER_IID_STR "110b2d81-148d-49f9-b805-403ac6ac82bb"

#define INLHCOMMENTTALKER_IID \
  {0x110b2d81, 0x148d, 0x49f9, \
    { 0xb8, 0x05, 0x40, 0x3a, 0xc6, 0xac, 0x82, 0xbb }}

class NS_NO_VTABLE NS_SCRIPTABLE INLHCommentTalker : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(INLHCOMMENTTALKER_IID)

  /* long Add (in long nData1, in long nData2); */
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 nData1, PRInt32 nData2, PRInt32 *_retval NS_OUTPARAM) = 0;

  /* long callTalkerProgram (in wstring execPath, in wstring strData); */
  NS_SCRIPTABLE NS_IMETHOD CallTalkerProgram(const PRUnichar *execPath, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) = 0;

  /* long sayBouyomichan (in wstring server, in wstring strData); */
  NS_SCRIPTABLE NS_IMETHOD SayBouyomichan(const PRUnichar *server, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) = 0;

  /* long sayKotoeri (in wstring strData); */
  NS_SCRIPTABLE NS_IMETHOD SayKotoeri(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) = 0;

};

  NS_DEFINE_STATIC_IID_ACCESSOR(INLHCommentTalker, INLHCOMMENTTALKER_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_INLHCOMMENTTALKER \
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 nData1, PRInt32 nData2, PRInt32 *_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD CallTalkerProgram(const PRUnichar *execPath, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD SayBouyomichan(const PRUnichar *server, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM); \
  NS_SCRIPTABLE NS_IMETHOD SayKotoeri(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_INLHCOMMENTTALKER(_to) \
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 nData1, PRInt32 nData2, PRInt32 *_retval NS_OUTPARAM) { return _to Add(nData1, nData2, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD CallTalkerProgram(const PRUnichar *execPath, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) { return _to CallTalkerProgram(execPath, strData, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD SayBouyomichan(const PRUnichar *server, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) { return _to SayBouyomichan(server, strData, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD SayKotoeri(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) { return _to SayKotoeri(strData, _retval); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_INLHCOMMENTTALKER(_to) \
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 nData1, PRInt32 nData2, PRInt32 *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->Add(nData1, nData2, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD CallTalkerProgram(const PRUnichar *execPath, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->CallTalkerProgram(execPath, strData, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD SayBouyomichan(const PRUnichar *server, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->SayBouyomichan(server, strData, _retval); } \
  NS_SCRIPTABLE NS_IMETHOD SayKotoeri(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->SayKotoeri(strData, _retval); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class _MYCLASS_ : public INLHCommentTalker
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_INLHCOMMENTTALKER

  _MYCLASS_();

private:
  ~_MYCLASS_();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(_MYCLASS_, INLHCommentTalker)

_MYCLASS_::_MYCLASS_()
{
  /* member initializers and constructor code */
}

_MYCLASS_::~_MYCLASS_()
{
  /* destructor code */
}

/* long Add (in long nData1, in long nData2); */
NS_IMETHODIMP _MYCLASS_::Add(PRInt32 nData1, PRInt32 nData2, PRInt32 *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* long callTalkerProgram (in wstring execPath, in wstring strData); */
NS_IMETHODIMP _MYCLASS_::CallTalkerProgram(const PRUnichar *execPath, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* long sayBouyomichan (in wstring server, in wstring strData); */
NS_IMETHODIMP _MYCLASS_::SayBouyomichan(const PRUnichar *server, const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* long sayKotoeri (in wstring strData); */
NS_IMETHODIMP _MYCLASS_::SayKotoeri(const PRUnichar *strData, PRInt32 *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


#endif /* __gen_ICommentTalker_h__ */
