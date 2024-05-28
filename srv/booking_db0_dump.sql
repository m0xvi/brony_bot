-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: localhost    Database: booking_db0
-- ------------------------------------------------------
-- Server version	8.0.36-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `booking_history`
--

DROP TABLE IF EXISTS `booking_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int DEFAULT NULL,
  `booking_id` varchar(36) DEFAULT NULL,
  `booking_date` date DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `item_id` (`item_id`),
  KEY `booking_id` (`booking_id`),
  CONSTRAINT `booking_history_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `item_status` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `booking_history_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_history`
--

LOCK TABLES `booking_history` WRITE;
/*!40000 ALTER TABLE `booking_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `booking_id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `arrival_date` date NOT NULL,
  `children` int DEFAULT '0',
  `phone` varchar(20) NOT NULL,
  `comments` text,
  `total_price` decimal(10,2) NOT NULL,
  `booking_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES ('1ca74ad1-3991-44b1-bafc-d73ef7d9c190','dwsfwefw','2024-05-25',1,'+7(434)535-35-53','453fer',8500.00,'2024-05-22 01:41:47');
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_bookings`
--

DROP TABLE IF EXISTS `item_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_bookings` (
  `booking_id` varchar(36) NOT NULL,
  `item_id` int NOT NULL,
  `booking_date` date NOT NULL,
  PRIMARY KEY (`booking_id`,`item_id`,`booking_date`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `item_bookings_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE,
  CONSTRAINT `item_bookings_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `item_status` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_bookings`
--

LOCK TABLES `item_bookings` WRITE;
/*!40000 ALTER TABLE `item_bookings` DISABLE KEYS */;
INSERT INTO `item_bookings` VALUES ('1ca74ad1-3991-44b1-bafc-d73ef7d9c190',3,'2024-05-25'),('1ca74ad1-3991-44b1-bafc-d73ef7d9c190',6,'2024-05-25');
/*!40000 ALTER TABLE `item_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_status`
--

DROP TABLE IF EXISTS `item_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_status` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `item_type` enum('bed','lounger') NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `is_booked` tinyint(1) DEFAULT '0',
  `booking_date` date DEFAULT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_status`
--

LOCK TABLES `item_status` WRITE;
/*!40000 ALTER TABLE `item_status` DISABLE KEYS */;
INSERT INTO `item_status` VALUES (1,'bed',4000.00,0,NULL),(2,'bed',4000.00,0,NULL),(3,'bed',4000.00,1,'2024-05-25'),(4,'bed',40000.00,0,NULL),(5,'bed',40000.00,0,NULL),(6,'bed',4000.00,0,NULL),(7,'bed',4000.00,0,NULL),(8,'bed',4000.00,0,NULL),(9,'lounger',2000.00,0,NULL),(10,'lounger',2000.00,0,NULL),(11,'lounger',2000.00,0,NULL),(12,'lounger',2000.00,0,NULL),(13,'lounger',2000.00,0,NULL),(14,'lounger',2000.00,0,NULL),(15,'lounger',2000.00,0,NULL),(16,'lounger',2000.00,0,NULL);
/*!40000 ALTER TABLE `item_status` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-05-22  5:21:30
