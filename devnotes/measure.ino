#include <Arduino.h>

const uint8_t IN_PIN = A0;         // Take reading on this input PIN
const unsigned int numAvgs = 50;   // Average this many into one "reading"
const unsigned int numRep = 10;    // Repeat this many in automatic sequence
const unsigned int msPerRep = 500; // Spaced by msPerRep millis per repeat
const float vcc = 3.3;
const float bits = 4096.0;

unsigned int needRep = 0; // Pending repeats remaining or zero
unsigned long tock = 0;   // Milliseconds or zero when next repeat occurs
int count = 0;            // Incremented count of readings

void setup()
{
  // put your setup code here, to run once:
  pinMode(IN_PIN, INPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  Serial.begin(115200);
  while (!Serial)
  {
    ; // For Leonardo only
  }
  digitalWrite(GREEN_LED, HIGH);
  count = 0;
}

void sensorLoop()
{
  unsigned long sumSensors = 0;
  for (int navg = 0; navg < numAvgs; navg++)
  {
    sumSensors += analogRead(IN_PIN);
    delay(1);
  }
  Serial.print("[");
  Serial.print(count);
  Serial.print("]: ");
  Serial.println((sumSensors / numAvgs) / bits * vcc, 3);
  count++;
}

void rep_cb()
{
  // Serial.print(needRep, DEC);
  // Serial.print(' ');
  sensorLoop();
}

void handleCmd()
{
  int handshake = Serial.read();
  if (handshake == '9')
  { // Ascii code 57 for numerical 9
    Serial.flush();
    tock = 0; // Cancel timer if running
  }
  else if (handshake == '8')
  { // Ascii code 56 for numerical 8
    // Serial.println(F("Start"));
    needRep = numRep; // Reset repeat counter to beginning
    tock = millis();  // Set timer "tock" to fire very soon
  }
  else if (handshake == '6')
  {               // Ascii code 54 for 6
    sensorLoop(); // Print single reading on demand
  }
}

void handleTock()
{
  unsigned long tick = millis(); // Grab current "time"
  if (tick > tock)
  { // Has timer "tock" expired?
    if (needRep)
    {
      needRep--;
      rep_cb();
    }
    if (needRep)
    {                   // Perform callback & check if more
      tock += msPerRep; // Advance timer by inteval
    }
    else
    {
      tock = 0; // Cancel timer, it is done for now
    }
  }
}

void loop()
{
  // if we get a valid byte, read analog ins:
  if (Serial.available() > 0)
  {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(GREEN_LED, LOW);
    handleCmd(); // Read & handle serial char
    delay(5);    // Ensure flash lasts a little while
    digitalWrite(RED_LED, LOW);
    digitalWrite(GREEN_LED, HIGH);
  }
  //Timer related checks
  if (tock)
  { // Is a timer event pending?
    handleTock();
  }
}
