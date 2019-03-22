# Joshua Aidelman
#     1000139
# Last Updated: 2/5/19


CC = gcc
CFLAGS = -Wall -std=c11 -g -Iinclude
LDFLAGS = -L./..
SHARED_LIBRARIES = -llist -lcal

all: CalendarParser.o libcal.so

libcal.so: include/LinkedListAPI.h include/CalendarParser.h src/LinkedListAPI.c  src/CalendarParser.c
	$(CC) -shared CalendarParser.o LinkedListAPI.o -o ../libcal.so

CalendarParser.o: include/LinkedListAPI.h include/CalendarParser.h src/LinkedListAPI.c  src/CalendarParser.c
	$(CC) $(CFLAGS) -c -fpic src/CalendarParser.c src/LinkedListAPI.c

clean:
	rm -rf ../*.o ../*.so
