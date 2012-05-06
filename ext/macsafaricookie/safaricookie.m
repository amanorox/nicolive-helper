//
//  safaricookie.m
//  xpcom_commenttalker-mac
//
//  Created by 宗政俊一 on 10/03/23.
//  Copyright 2010 __MyCompanyName__. All rights reserved.
//

#import "safaricookie.h"

#import <Foundation/NSObject.h>
#import <Foundation/NSHTTPCookieStorage.h>
#import <Foundation/NSHTTPCookie.h>
#import <Foundation/NSArray.h>
#import <Foundation/NSURL.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>


int getnicocookie(char*cookie,int len)
{
    id c = [NSHTTPCookieStorage sharedHTTPCookieStorage];
    id url = [NSURL URLWithString:@"http://www.nicovideo.jp/"];
    id cookies;
    cookies = [c cookiesForURL:url];
	
    int i;
    for( i=0; i<[cookies count];i++){
        id obj = [cookies objectAtIndex:i];
        char*name = [[obj name] UTF8String];
        if(strcmp(name,"user_session")==0){
            char*value = [[obj value] UTF8String];
            memset(cookie,0,len);
            strncpy(cookie,value,len-1);
        }
    }
    return 0;
}

